import axios from "axios";
import type { Cart, CartItem, CartItemSnapshot } from "../types/cart";

const CACHE_PREFIX = "classyshop_cart_cache:";
const QUEUE_PREFIX = "classyshop_cart_queue:";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 14;

export const GUEST_CART_SCOPE = "guest";

export type CartOperation =
  | {
      type: "add";
      productId: string;
      size: string;
      color: string;
      quantity: number;
      snapshot?: CartItemSnapshot;
    }
  | {
      type: "update";
      productId: string;
      size: string;
      color: string;
      quantity: number;
    }
  | {
      type: "remove";
      productId: string;
      size: string;
      color: string;
    };

interface CachedCart {
  cart: Cart;
  savedAt: number;
}

export const getCartScope = (
  isAuthenticated: boolean,
  userId?: string | null,
): string =>
  isAuthenticated && userId ? `user:${userId}` : GUEST_CART_SCOPE;

export const getLineKey = (
  productId: string,
  size: string,
  color: string,
): string => `${productId}::${size}::${color}`;

const safeParse = <T>(raw: string | null): T | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const isCartLike = (value: unknown): value is Cart => {
  if (!value || typeof value !== "object") return false;
  const cart = value as Partial<Cart>;
  return Array.isArray(cart.products);
};

export const isNetworkError = (error: unknown): boolean => {
  if (!axios.isAxiosError(error)) return false;
  if (!error.response) return true;
  return error.code === "ERR_NETWORK" || error.code === "ECONNABORTED";
};

/* -------------------------------------------------------------------------- */
/* Cached cart                                                                */
/* -------------------------------------------------------------------------- */

export const readCachedCart = (scope: string): Cart | null => {
  if (typeof window === "undefined") return null;

  const cached = safeParse<CachedCart>(
    window.localStorage.getItem(`${CACHE_PREFIX}${scope}`),
  );

  if (!cached || !isCartLike(cached.cart)) return null;
  if (Date.now() - Number(cached.savedAt || 0) > CACHE_TTL_MS) return null;

  const products = cached.cart.products.filter(
    (item): item is CartItem =>
      !!item &&
      typeof item.productId === "string" &&
      typeof item.name === "string" &&
      typeof item.quantity === "number",
  );

  return {
    ...cached.cart,
    products,
    totalPrice: Number(cached.cart.totalPrice) || 0,
  };
};

export const writeCachedCart = (scope: string, cart: Cart): void => {
  if (typeof window === "undefined") return;

  try {
    const payload: CachedCart = { cart, savedAt: Date.now() };
    window.localStorage.setItem(
      `${CACHE_PREFIX}${scope}`,
      JSON.stringify(payload),
    );
  } catch {
    // Storage can be unavailable (private mode, quota). The in-memory cart
    // still works for the current session.
  }
};

export const clearCachedCart = (scope: string): void => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(`${CACHE_PREFIX}${scope}`);
  } catch {
    // Ignore storage errors.
  }
};

/* -------------------------------------------------------------------------- */
/* Pending operations queue                                                   */
/* -------------------------------------------------------------------------- */

export const readCartQueue = (scope: string): CartOperation[] => {
  if (typeof window === "undefined") return [];

  const queue = safeParse<CartOperation[]>(
    window.localStorage.getItem(`${QUEUE_PREFIX}${scope}`),
  );

  if (!Array.isArray(queue)) return [];

  return queue.filter(
    (operation): operation is CartOperation =>
      !!operation &&
      (operation.type === "add" ||
        operation.type === "update" ||
        operation.type === "remove") &&
      typeof operation.productId === "string" &&
      typeof operation.size === "string" &&
      typeof operation.color === "string" &&
      (operation.type === "remove" || Number.isFinite(operation.quantity)),
  );
};

export const writeCartQueue = (
  scope: string,
  queue: CartOperation[],
): void => {
  if (typeof window === "undefined") return;

  try {
    if (queue.length === 0) {
      window.localStorage.removeItem(`${QUEUE_PREFIX}${scope}`);
    } else {
      window.localStorage.setItem(
        `${QUEUE_PREFIX}${scope}`,
        JSON.stringify(queue),
      );
    }
  } catch {
    // Ignore storage errors.
  }
};

/**
 * Queues an offline mutation. Consecutive additions to the same line are
 * merged; everything else is appended so replay order stays faithful to what
 * the shopper saw on screen.
 */
export const enqueueCartOperation = (
  scope: string,
  operation: CartOperation,
): void => {
  const queue = readCartQueue(scope);
  const last = queue[queue.length - 1];

  if (operation.type === "add") {
    const lineKey = getLineKey(
      operation.productId,
      operation.size,
      operation.color,
    );
    const lastKey =
      last &&
      getLineKey(last.productId, last.size, last.color);

    if (last?.type === "add" && lastKey === lineKey) {
      queue[queue.length - 1] = {
        ...last,
        quantity: last.quantity + operation.quantity,
        snapshot: operation.snapshot ?? last.snapshot,
      };
      writeCartQueue(scope, queue);
      return;
    }
  }

  writeCartQueue(scope, [...queue, operation]);
};

/* -------------------------------------------------------------------------- */
/* Local cart projection                                                      */
/* -------------------------------------------------------------------------- */

const recomputeTotal = (products: CartItem[]): number =>
  products.reduce(
    (total, item) =>
      total +
      (Number(item.price) || 0) * (Number(item.quantity) || 0),
    0,
  );

/**
 * Applies a mutation to the local cart so the UI updates immediately. The
 * server response later replaces this projection with authoritative data.
 */
export const applyCartOperation = (
  cart: Cart | null,
  operation: CartOperation,
): Cart => {
  const current: Cart = cart ?? { products: [], totalPrice: 0 };
  const lineKey = getLineKey(
    operation.productId,
    operation.size,
    operation.color,
  );
  const products = current.products.map((item) => ({ ...item }));
  const index = products.findIndex(
    (item) =>
      getLineKey(item.productId, item.size, item.color) === lineKey,
  );

  if (operation.type === "add") {
    if (index > -1) {
      products[index] = {
        ...products[index],
        name: operation.snapshot?.name || products[index].name,
        image: operation.snapshot?.image ?? products[index].image,
        price:
          typeof operation.snapshot?.price === "number"
            ? operation.snapshot.price
            : products[index].price,
        quantity:
          (Number(products[index].quantity) || 0) + operation.quantity,
      };
    } else if (operation.snapshot) {
      products.push({
        productId: operation.productId,
        name: operation.snapshot.name,
        image: operation.snapshot.image || "",
        price: operation.snapshot.price,
        size: operation.size,
        color: operation.color,
        quantity: operation.quantity,
      });
    }
  }

  if (operation.type === "update" && index > -1) {
    if (operation.quantity > 0) {
      products[index] = {
        ...products[index],
        quantity: operation.quantity,
      };
    } else {
      products.splice(index, 1);
    }
  }

  if (operation.type === "remove" && index > -1) {
    products.splice(index, 1);
  }

  return {
    ...current,
    products,
    totalPrice: recomputeTotal(products),
  };
};

/* -------------------------------------------------------------------------- */
/* Queue replay                                                               */
/* -------------------------------------------------------------------------- */

export interface FlushResult {
  cart: Cart | null;
  flushed: number;
  remaining: number;
  offline: boolean;
}

/**
 * Replays queued mutations in order. Network failures stop the replay so the
 * remaining operations survive until the next reconnect. Business failures
 * (validation, stock) are dropped, then the caller refreshes the server cart.
 */
export const flushCartQueue = async (
  scope: string,
  executor: (operation: CartOperation) => Promise<Cart>,
): Promise<FlushResult> => {
  const queue = readCartQueue(scope);
  let cart: Cart | null = null;
  let flushed = 0;
  let offline = false;

  while (queue.length > 0) {
    const operation = queue[0];

    try {
      cart = await executor(operation);
      queue.shift();
      flushed += 1;
      writeCartQueue(scope, queue);
    } catch (error) {
      if (isNetworkError(error)) {
        offline = true;
        break;
      }

      // A server-side rejection means this operation can never succeed. Drop
      // it so a bad entry cannot block the rest of the queue forever.
      queue.shift();
      writeCartQueue(scope, queue);
    }
  }

  if (cart) writeCachedCart(scope, cart);

  return {
    cart,
    flushed,
    remaining: queue.length,
    offline,
  };
};
