import React, { useEffect, useState, useCallback, useMemo } from "react";
import type { Cart } from "../types/cart";
import { cartService } from "../services/cartService";
import { useAuth } from "../hooks/useAuth";
import { CartContext } from "./cart-context";

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch or merge cart on auth state change
  const refreshCart = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isAuthenticated) {
        const storedGuestId = cartService.getStoredGuestId();
        if (storedGuestId) {
          try {
            const mergedCart = await cartService.mergeCart(storedGuestId);
            cartService.clearGuestId();
            setCart(mergedCart);
            return;
          } catch {
            // Guest cart might not exist or be empty, proceed to load user cart
            cartService.clearGuestId();
          }
        }
        const userCart = await cartService.getCart();
        setCart(userCart);
      } else {
        const guestId = cartService.getGuestId();
        const guestCart = await cartService.getCart(guestId);
        setCart(guestCart);
      }
    } catch (error) {
      console.warn("Failed to load cart:", error);
      setCart({ products: [], totalPrice: 0 });
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authLoading) {
      refreshCart();
    }
  }, [authLoading, isAuthenticated, refreshCart]);

  const addToCart = useCallback(
    async (
      productId: string,
      size: string,
      color: string,
      quantity = 1
    ): Promise<void> => {
      try {
        const guestId = !isAuthenticated ? cartService.getGuestId() : undefined;
        const updatedCart = await cartService.addToCart({
          productId,
          size,
          color,
          quantity,
          guestId,
        });
        setCart(updatedCart);
      } catch (error) {
        console.error("Failed to add to cart:", error);
        throw error;
      }
    },
    [isAuthenticated]
  );

  const updateQuantity = useCallback(
    async (
      productId: string,
      size: string,
      color: string,
      quantity: number
    ): Promise<void> => {
      try {
        const guestId = !isAuthenticated ? cartService.getGuestId() : undefined;
        const updatedCart = await cartService.updateCartItem({
          productId,
          size,
          color,
          quantity,
          guestId,
        });
        setCart(updatedCart);
      } catch (error) {
        console.error("Failed to update cart quantity:", error);
        throw error;
      }
    },
    [isAuthenticated]
  );

  const removeFromCart = useCallback(
    async (productId: string, size: string, color: string): Promise<void> => {
      try {
        const guestId = !isAuthenticated ? cartService.getGuestId() : undefined;
        const updatedCart = await cartService.deleteCartItem({
          productId,
          size,
          color,
          guestId,
        });
        setCart(updatedCart);
      } catch (error) {
        console.error("Failed to remove item from cart:", error);
        throw error;
      }
    },
    [isAuthenticated]
  );

  const clearCart = useCallback(() => {
    setCart({ products: [], totalPrice: 0 });
  }, []);

  const items = useMemo(() => cart?.products ?? [], [cart]);

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
    [items]
  );

  const totalPrice = useMemo(() => {
    if (typeof cart?.totalPrice === "number") {
      return cart.totalPrice;
    }
    return items.reduce(
      (sum, item) =>
        sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
      0
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
