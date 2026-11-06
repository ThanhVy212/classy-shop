import type { ProductImage } from "./product";

/**
 * The product snapshot stored with a wishlist entry. The server returns this
 * subset so the storefront can render saved cards without extra requests.
 * Guests keep the same shape in localStorage.
 */
export interface WishlistProduct {
  _id: string;
  name: string;
  price: number;
  discountPrice?: number;
  countInStock?: number;
  category?: string;
  sizes?: string[];
  colors?: string[];
  images?: ProductImage[];
  image?: string;
  isPublished?: boolean;
}

export interface WishlistItem {
  productId: string;
  addedAt: string;
  product: WishlistProduct;
}

export interface WishlistResponse {
  items: WishlistItem[];
}
