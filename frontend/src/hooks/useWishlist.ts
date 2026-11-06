import { useContext } from "react";
import { WishlistContext } from "../context/wishlist-context";
import type { WishlistContextType } from "../context/wishlist-context";

export const useWishlist = (): WishlistContextType => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
};

export default useWishlist;
