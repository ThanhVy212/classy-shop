import { useContext } from "react";
import { CartContext } from "../context/cart-context";
import type { CartContextType } from "../context/cart-context";

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};

export default useCart;
