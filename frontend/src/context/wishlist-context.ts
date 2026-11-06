import { createContext } from "react";
import type { WishlistItem, WishlistProduct } from "../types/wishlist";

export interface WishlistContextType {
  items: WishlistItem[];
  count: number;
  isLoading: boolean;
  isWishlisted: (productId: string) => boolean;
  toggleWishlist: (product: WishlistProduct) => Promise<boolean>;
  removeFromWishlist: (productId: string) => Promise<void>;
  clearWishlist: () => Promise<void>;
  refreshWishlist: () => Promise<void>;
}

export const WishlistContext = createContext<
  WishlistContextType | undefined
>(undefined);
