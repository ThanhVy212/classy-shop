import api from "./api";
import axios from "axios";
import type {
  Cart,
  AddCartItemPayload,
  UpdateCartItemPayload,
  DeleteCartItemPayload,
} from "../types/cart";

const GUEST_ID_KEY = "classyshop_guest_id";

export const cartService = {
  getGuestId(): string {
    let guestId = localStorage.getItem(GUEST_ID_KEY);
    if (!guestId) {
      guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(GUEST_ID_KEY, guestId);
    }
    return guestId;
  },

  getStoredGuestId(): string | null {
    return localStorage.getItem(GUEST_ID_KEY);
  },

  clearGuestId(): void {
    localStorage.removeItem(GUEST_ID_KEY);
  },

  async getCart(guestId?: string): Promise<Cart> {
    try {
      const response = await api.get<Cart>("/cart", {
        params: guestId ? { guestId } : undefined,
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return { products: [], totalPrice: 0 };
      }
      throw error;
    }
  },

  async addToCart(data: AddCartItemPayload): Promise<Cart> {
    const response = await api.post<Cart>("/cart", data);
    return response.data;
  },

  async updateCartItem(data: UpdateCartItemPayload): Promise<Cart> {
    const response = await api.put<Cart>("/cart", data);
    return response.data;
  },

  async deleteCartItem(data: DeleteCartItemPayload): Promise<Cart> {
    const response = await api.delete<Cart>("/cart", { data });
    return response.data;
  },

  async mergeCart(guestId: string): Promise<Cart> {
    const response = await api.post<Cart>("/cart/merge", { guestId });
    return response.data;
  },
};

export default cartService;
