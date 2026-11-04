export type OrderStatus = "Processing" | "Shipped" | "Delivered" | "Cancelled";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export type PaymentMethod = "COD";

export type ShippingMethod = "standard" | "express";

export interface OrderItem {
  productId: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
}

export interface OrderShippingAddress {
  fullName: string;
  phone: string;
  address: string;
  apartment?: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface OrderStatusEvent {
  status: OrderStatus;
  changedAt: string;
  note?: string;
}

export interface PaymentStatusEvent {
  status: PaymentStatus;
  changedAt: string;
  note?: string;
}

export interface OrderCustomer {
  _id: string;
  name: string;
  email: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  user?: OrderCustomer | string;
  orderItems: OrderItem[];
  shippingAddress: OrderShippingAddress;
  contactEmail: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  isPaid: boolean;
  paidAt?: string | null;
  refundedAt?: string | null;
  orderStatus: OrderStatus;
  isDelivered: boolean;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string;
  shippingMethod: ShippingMethod;
  itemsPrice: number;
  shippingPrice: number;
  taxPrice: number;
  discountAmount: number;
  promoCode?: string | null;
  totalPrice: number;
  statusHistory: OrderStatusEvent[];
  paymentHistory: PaymentStatusEvent[];
  itemsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderPayload {
  contactEmail: string;
  shippingAddress: OrderShippingAddress;
  shippingMethod: ShippingMethod;
  paymentMethod: PaymentMethod;
  promoCode?: string | null;
  notes?: string;
}

export interface OrdersQuery {
  page?: number;
  limit?: number;
  status?: OrderStatus | "all";
  paymentStatus?: PaymentStatus | "all";
  search?: string;
  sort?: "newest" | "oldest" | "totalDesc" | "totalAsc";
}

export interface OrdersResponse {
  orders: Order[];
  page: number;
  pages: number;
  total: number;
  limit: number;
}

export interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  pendingPayments: number;
  todayOrders: number;
  statusCounts: Record<OrderStatus, number>;
  paymentCounts: Record<PaymentStatus, number>;
}

export interface OrderStatsResponse {
  stats: OrderStats;
  recentOrders: Order[];
}
