import { createContext } from "react";
import type { Cart, CartItem } from "../types/cart";

export interface CartContextType {
  cart: Cart | null;
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  isLoading: boolean;
  addToCart: (
    productId: string,
    size: string,
    color: string,
    quantity?: number
  ) => Promise<void>;
  updateQuantity: (
    productId: string,
    size: string,
    color: string,
    quantity: number
  ) => Promise<void>;
  removeFromCart: (
    productId: string,
    size: string,
    color: string
  ) => Promise<void>;
  refreshCart: () => Promise<void>;
  clearCart: () => void;
}

export const CartContext = createContext<CartContextType | undefined>(undefined);
