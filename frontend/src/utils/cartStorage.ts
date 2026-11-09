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

const DEFINITIVE_REJECTION_STATUSES = new Set([400, 404, 409, 422]);

/**
 * A definitive rejection can never succeed if replayed, so the operation may be
 * dropped. Everything else - network loss, 401 auth refresh, 408 timeouts, 429
 * rate limits, 5xx server errors and unknown failures - is treated as
 * transient and keeps the operation queued for a later retry.
 */
export const isDefinitiveCartRejection = (error: unknown): boolean => {
  if (!axios.isAxiosError(error) || !error.response) return false;
  return DEFINITIVE_REJECTION_STATUSES.has(error.response.status);
};

/* -------------------------------------------------------------------------- */
/* Cached cart                                                                */
/* -------------------------------------------------------------------------- */

export const readCachedCart = (scope: string): Cart | null => {
  if (typeof window === "undefined") return null;

  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(`${CACHE_PREFIX}${scope}`);
  } catch {
    // Storage access can throw (privacy mode, blocked cookies). Treat it as a
    // cache miss so CartProvider initializers keep their safe fallback.
    return null;
  }

  const cached = safeParse<CachedCart>(raw);

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

  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(`${QUEUE_PREFIX}${scope}`);
  } catch {
    // No readable storage means no known pending work; callers can still
    // operate in-memory for this session.
    return [];
  }

  const queue = safeParse<CartOperation[]>(raw);

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
 * Replays queued mutations in order. Transient failures (network loss, 401,
 * 408, 429, 5xx and unknown errors) stop the replay so the remaining
 * operations survive until the next retry. Definitive rejections (400, 404,
 * 409, 422) are dropped, then the caller refreshes the server cart.
 *
 * Only one flush may run per scope at a time; concurrent callers share the
 * in-flight promise instead of racing on the same localStorage queue.
 */
const inFlightFlushes = new Map<string, Promise<FlushResult>>();

const runFlushCartQueue = async (
  scope: string,
  executor: (operation: CartOperation) => Promise<Cart>,
): Promise<FlushResult> => {
  let cart: Cart | null = null;
  let flushed = 0;
  let offline = false;
  let queueCleared = false;

  while (true) {
    // Re-read before selecting each operation: enqueue/clear may have changed
    // the queue while the previous executor was in flight.
    const queue = readCartQueue(scope);
    if (queue.length === 0) break;

    const operation = queue[0];

    try {
      cart = await executor(operation);
      flushed += 1;
    } catch (error) {
      // Network failures and transient responses (401, 408, 429, 5xx, etc.)
      // must leave the queued operation untouched so it can be retried.
      if (!isDefinitiveCartRejection(error)) {
        offline = true;
        break;
      }

      // Definitive rejection (400, 404, 409, 422): this operation can never
      // succeed, so drop it below instead of blocking the queue forever.
    }

    // Remove the processed head from a freshly read queue, never from the
    // stale snapshot captured before the request. This keeps concurrent
    // enqueues (and a concurrent clear) intact.
    const freshQueue = readCartQueue(scope);
    if (freshQueue.length === 0) {
      // The queue disappeared while the request was in flight (clearCart), so
      // there is no processed head left to remove.
      queueCleared = true;
      break;
    }

    freshQueue.shift();
    writeCartQueue(scope, freshQueue);
  }

  // Do not restore a stale cached cart if the shopper cleared it meanwhile.
  if (cart && !queueCleared) writeCachedCart(scope, cart);

  return {
    cart,
    flushed,
    remaining: readCartQueue(scope).length,
    offline,
  };
};

export const flushCartQueue = (
  scope: string,
  executor: (operation: CartOperation) => Promise<Cart>,
): Promise<FlushResult> => {
  const inFlight = inFlightFlushes.get(scope);
  if (inFlight) return inFlight;

  const run = runFlushCartQueue(scope, executor).finally(() => {
    inFlightFlushes.delete(scope);
  });

  inFlightFlushes.set(scope, run);
  return run;
};
