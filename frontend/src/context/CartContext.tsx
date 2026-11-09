import React, { useEffect, useState, useCallback, useMemo } from "react";
import type { Cart, CartItemSnapshot } from "../types/cart";
import { cartService } from "../services/cartService";
import { useAuth } from "../hooks/useAuth";
import { CartContext } from "./cart-context";
import {
  GUEST_CART_SCOPE,
  applyCartOperation,
  clearCachedCart,
  enqueueCartOperation,
  flushCartQueue,
  getCartScope,
  isNetworkError,
  readCachedCart,
  readCartQueue,
  writeCachedCart,
  writeCartQueue,
  type CartOperation,
} from "../utils/cartStorage";

const GUEST_SYNC_PENDING_MESSAGE = "guest-cart-sync-pending";

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const scope = useMemo(
    () => getCartScope(isAuthenticated, user?._id),
    [isAuthenticated, user?._id],
  );
  const [cart, setCart] = useState<Cart | null>(() => readCachedCart(scope));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(
    () => readCartQueue(scope).length,
  );

  const commitCart = useCallback((next: Cart) => {
    setCart(next);
    writeCachedCart(scope, next);
  }, [scope]);

  const executeOperation = useCallback(
    async (operation: CartOperation, guestId?: string): Promise<Cart> => {
      switch (operation.type) {
        case "add":
          return cartService.addToCart({
            productId: operation.productId,
            size: operation.size,
            color: operation.color,
            quantity: operation.quantity,
            guestId,
          });
        case "update":
          return cartService.updateCartItem({
            productId: operation.productId,
            size: operation.size,
            color: operation.color,
            quantity: operation.quantity,
            guestId,
          });
        default:
          return cartService.deleteCartItem({
            productId: operation.productId,
            size: operation.size,
            color: operation.color,
            guestId,
          });
      }
    },
    [],
  );

  const syncQueue = useCallback(
    async (targetScope: string, guestId?: string) => {
      const result = await flushCartQueue(targetScope, (operation) =>
        executeOperation(operation, guestId),
      );

      if (targetScope === scope) {
        setPendingSyncCount(result.remaining);
        if (result.cart) commitCart(result.cart);
      }

      return result;
    },
    [commitCart, executeOperation, scope],
  );

  // Fetch or merge cart on auth state change. Pending offline mutations are
  // replayed first so the server response never discards them.
  const refreshCart = useCallback(async () => {
    setIsLoading(true);

    try {
      if (isAuthenticated) {
        // A guest may have queued mutations while offline and then signed in.
        // Push those to the guest cart before merging it into the account.
        if (readCartQueue(GUEST_CART_SCOPE).length > 0) {
          const guestId =
            cartService.getStoredGuestId() ?? cartService.getGuestId();
          const guestSync = await syncQueue(GUEST_CART_SCOPE, guestId);

          // Reconnect later to finish replaying the rest; do not merge a
          // half-synced guest cart.
          if (guestSync.offline || guestSync.remaining > 0) {
            throw new Error(GUEST_SYNC_PENDING_MESSAGE);
          }
        }

        await syncQueue(scope);

        const storedGuestId = cartService.getStoredGuestId();
        if (storedGuestId) {
          try {
            const mergedCart = await cartService.mergeCart(storedGuestId);
            cartService.clearGuestId();
            clearCachedCart(GUEST_CART_SCOPE);
            commitCart(mergedCart);
            return;
          } catch (error) {
            if (isNetworkError(error)) throw error;

            // The guest cart is empty or was already merged. Drop the id so
            // the next load goes straight to the account cart.
            cartService.clearGuestId();
            clearCachedCart(GUEST_CART_SCOPE);
          }
        }

        commitCart(await cartService.getCart());
      } else {
        await syncQueue(scope, cartService.getGuestId());
        commitCart(await cartService.getCart(cartService.getGuestId()));
      }
    } catch (error) {
      const cached = readCachedCart(scope);
      // While signing in offline, the guest cart is the best local proxy for
      // the account cart until the merge can reach the server.
      const guestCached = isAuthenticated
        ? readCachedCart(GUEST_CART_SCOPE)
        : null;
      const fallback =
        cached && (cached.products.length > 0 || !guestCached)
          ? cached
          : guestCached;

      if (fallback) {
        setCart(fallback);
      } else if (!isNetworkError(error)) {
        setCart({ products: [], totalPrice: 0 });
      }

      // Offline is expected; keep the optimistic/cached cart instead of
      // wiping it. Anything else is worth surfacing in development.
      const isPendingGuestSync =
        error instanceof Error &&
        error.message === GUEST_SYNC_PENDING_MESSAGE;

      if (!isNetworkError(error) && !isPendingGuestSync) {
        console.warn("Failed to load cart:", error);
      }
    } finally {
      setIsLoading(false);
      setPendingSyncCount(readCartQueue(scope).length);
    }
  }, [commitCart, isAuthenticated, scope, syncQueue]);

  useEffect(() => {
    if (!authLoading) {
      void refreshCart();
    }
  }, [authLoading, isAuthenticated, refreshCart]);

  // Replay queued mutations as soon as the connection returns.
  useEffect(() => {
    const handleOnline = () => {
      void refreshCart();
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [refreshCart]);

  const addToCart = useCallback(
    async (
      productId: string,
      size: string,
      color: string,
      quantity = 1,
      snapshot?: CartItemSnapshot,
    ): Promise<void> => {
      const operation: CartOperation = {
        type: "add",
        productId,
        size,
        color,
        quantity,
        snapshot,
      };
      const previous = cart;

      // Optimistic update: the shopper sees the item immediately.
      commitCart(applyCartOperation(cart, operation));

      // Never send an out-of-order direct request while earlier mutations are
      // still queued; keep the optimistic state and replay in order instead.
      if (readCartQueue(scope).length > 0) {
        enqueueCartOperation(scope, operation);
        setPendingSyncCount(readCartQueue(scope).length);
        return;
      }

      try {
        const guestId = !isAuthenticated
          ? cartService.getGuestId()
          : undefined;
        const updatedCart = await cartService.addToCart({
          productId,
          size,
          color,
          quantity,
          guestId,
        });
        commitCart(updatedCart);
      } catch (error) {
        if (isNetworkError(error)) {
          enqueueCartOperation(scope, operation);
          setPendingSyncCount(readCartQueue(scope).length);
          return;
        }

        // Business errors (stock, invalid variant) must not stay on screen.
        if (previous) {
          commitCart(previous);
        } else {
          commitCart({ products: [], totalPrice: 0 });
        }
        throw error;
      }
    },
    [cart, commitCart, isAuthenticated, scope],
  );

  const updateQuantity = useCallback(
    async (
      productId: string,
      size: string,
      color: string,
      quantity: number,
    ): Promise<void> => {
      const operation: CartOperation = {
        type: "update",
        productId,
        size,
        color,
        quantity,
      };
      const previous = cart;
      commitCart(applyCartOperation(cart, operation));

      // Keep ordering intact: queue behind existing pending mutations.
      if (readCartQueue(scope).length > 0) {
        enqueueCartOperation(scope, operation);
        setPendingSyncCount(readCartQueue(scope).length);
        return;
      }

      try {
        const guestId = !isAuthenticated
          ? cartService.getGuestId()
          : undefined;
        const updatedCart = await cartService.updateCartItem({
          productId,
          size,
          color,
          quantity,
          guestId,
        });
        commitCart(updatedCart);
      } catch (error) {
        if (isNetworkError(error)) {
          enqueueCartOperation(scope, operation);
          setPendingSyncCount(readCartQueue(scope).length);
          return;
        }

        if (previous) {
          commitCart(previous);
        } else {
          commitCart({ products: [], totalPrice: 0 });
        }
        throw error;
      }
    },
    [cart, commitCart, isAuthenticated, scope],
  );

  const removeFromCart = useCallback(
    async (productId: string, size: string, color: string): Promise<void> => {
      const operation: CartOperation = {
        type: "remove",
        productId,
        size,
        color,
      };
      const previous = cart;
      commitCart(applyCartOperation(cart, operation));

      // Keep ordering intact: queue behind existing pending mutations.
      if (readCartQueue(scope).length > 0) {
        enqueueCartOperation(scope, operation);
        setPendingSyncCount(readCartQueue(scope).length);
        return;
      }

      try {
        const guestId = !isAuthenticated
          ? cartService.getGuestId()
          : undefined;
        const updatedCart = await cartService.deleteCartItem({
          productId,
          size,
          color,
          guestId,
        });
        commitCart(updatedCart);
      } catch (error) {
        if (isNetworkError(error)) {
          enqueueCartOperation(scope, operation);
          setPendingSyncCount(readCartQueue(scope).length);
          return;
        }

        if (previous) {
          commitCart(previous);
        } else {
          commitCart({ products: [], totalPrice: 0 });
        }
        throw error;
      }
    },
    [cart, commitCart, isAuthenticated, scope],
  );

  const clearCart = useCallback(() => {
    const emptyCart: Cart = { products: [], totalPrice: 0 };
    setCart(emptyCart);
    writeCachedCart(scope, emptyCart);
    writeCartQueue(scope, []);
    setPendingSyncCount(0);
  }, [scope]);

  const items = useMemo(() => cart?.products ?? [], [cart]);

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
    [items],
  );

  const totalPrice = useMemo(() => {
    if (typeof cart?.totalPrice === "number") {
      return cart.totalPrice;
    }
    return items.reduce(
      (sum, item) =>
        sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
      0,
    );
  }, [cart, items]);

  return (
    <CartContext.Provider
      value={{
        cart,
        items,
        totalItems,
        totalPrice,
        isLoading,
        pendingSyncCount,
        addToCart,
        updateQuantity,
        removeFromCart,
        refreshCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export default CartProvider;
