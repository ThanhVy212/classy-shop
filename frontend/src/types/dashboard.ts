import type { Order, OrderStatus, PaymentStatus } from "./order";

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  activeCustomers: number;
  totalCustomers: number;
  lowStockProducts: number;
  totalCollections: number;
  todayOrders: number;
  pendingPayments: number;
  newCustomersThisWeek: number;
  revenueChangePercent: number;
  ordersChangePercent: number;
  statusCounts: Record<OrderStatus, number>;
  paymentCounts: Record<PaymentStatus, number>;
}

export interface DashboardTopProduct {
  _id: string;
  name: string;
  image: string;
  category: string;
  price: number;
  sales: number;
  revenue: number;
}

export interface DashboardResponse {
  stats: DashboardStats;
  recentOrders: Order[];
  topProducts: DashboardTopProduct[];
}
