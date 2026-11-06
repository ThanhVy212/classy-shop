import api from "./api";
import type { WishlistItem, WishlistResponse } from "../types/wishlist";

const unwrap = (response: { data: WishlistResponse }): WishlistItem[] =>
  Array.isArray(response.data?.items) ? response.data.items : [];

export const wishlistService = {
  async getWishlist(): Promise<WishlistItem[]> {
    const response = await api.get<WishlistResponse>("/wishlist");
    return unwrap(response);
  },

  async add(productId: string): Promise<WishlistItem[]> {
    const response = await api.post<WishlistResponse>("/wishlist", {
      productId,
    });
    return unwrap(response);
  },

  async remove(productId: string): Promise<WishlistItem[]> {
    const response = await api.delete<WishlistResponse>(
      `/wishlist/${productId}`,
    );
    return unwrap(response);
  },

  async merge(productIds: string[]): Promise<WishlistItem[]> {
    const response = await api.post<WishlistResponse>("/wishlist/merge", {
      productIds,
    });
    return unwrap(response);
  },

  async clear(): Promise<WishlistItem[]> {
    const response = await api.delete<WishlistResponse>("/wishlist");
    return unwrap(response);
  },
};

export default wishlistService;
