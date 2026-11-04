import api from "./api";
import type {
  CreateDiscountPayload,
  DiscountCode,
  DiscountValidation,
} from "../types/discount";

export const discountService = {
  async validate(
    code: string,
    subtotal: number
  ): Promise<DiscountValidation> {
    const response = await api.post<{ discount: DiscountValidation }>(
      "/discounts/validate",
      { code, subtotal }
    );
    return response.data.discount;
  },

  async getAll(search?: string): Promise<DiscountCode[]> {
    const response = await api.get<{ discounts: DiscountCode[] }>(
      "/admin/discounts",
      {
        params: search ? { search } : undefined,
      }
    );
    return response.data.discounts;
  },

  async create(payload: CreateDiscountPayload): Promise<DiscountCode> {
    const response = await api.post<{ discount: DiscountCode }>(
      "/admin/discounts",
      payload
    );
    return response.data.discount;
  },

  async updateStatus(
    id: string,
    isActive: boolean
  ): Promise<DiscountCode> {
    const response = await api.patch<{ discount: DiscountCode }>(
      `/admin/discounts/${id}/status`,
      { isActive }
    );
    return response.data.discount;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/admin/discounts/${id}`);
  },
};

export default discountService;
