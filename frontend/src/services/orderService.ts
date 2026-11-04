import api from "./api";
import type {
  CreateOrderPayload,
  Order,
  OrdersQuery,
  OrdersResponse,
  OrderStatsResponse,
  OrderStatus,
  PaymentStatus,
} from "../types/order";

const cleanParams = (params?: OrdersQuery) => {
  if (!params) return undefined;

  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== "" && value !== "all"
    )
  );
};

export const orderService = {
  async createOrder(payload: CreateOrderPayload): Promise<Order> {
    const response = await api.post<{ order: Order }>("/orders", payload);
    return response.data.order;
  },

  async getMyOrders(params?: OrdersQuery): Promise<OrdersResponse> {
    const response = await api.get<OrdersResponse>("/orders", {
      params: cleanParams(params),
    });
    return response.data;
  },

  async getOrderById(id: string): Promise<Order> {
    const response = await api.get<{ order: Order }>(`/orders/${id}`);
    return response.data.order;
  },

  async cancelOrder(id: string, reason?: string): Promise<Order> {
    const response = await api.patch<{ order: Order }>(`/orders/${id}/cancel`, {
      reason,
    });
    return response.data.order;
  },

  /* ---------------------------- Admin ---------------------------- */

  async getAllOrders(params?: OrdersQuery): Promise<OrdersResponse> {
    const response = await api.get<OrdersResponse>("/admin/orders", {
      params: cleanParams(params),
    });
    return response.data;
  },

  async getOrderStats(): Promise<OrderStatsResponse> {
    const response = await api.get<OrderStatsResponse>("/admin/orders/stats");
    return response.data;
  },

  async updateOrderStatus(
    id: string,
    status: OrderStatus,
    note?: string
  ): Promise<Order> {
    const response = await api.patch<{ order: Order }>(
      `/admin/orders/${id}/status`,
      { status, note }
    );
    return response.data.order;
  },

  async updatePaymentStatus(
    id: string,
    paymentStatus: PaymentStatus,
    note?: string
  ): Promise<Order> {
    const response = await api.patch<{ order: Order }>(
      `/admin/orders/${id}/payment`,
      { paymentStatus, note }
    );
    return response.data.order;
  },
};

export default orderService;
