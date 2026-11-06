export type AdminNotificationType = "order_created" | "order_cancelled";

export interface AdminNotification {
  _id: string;
  type: AdminNotificationType;
  title: string;
  message: string;
  order: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationsResponse {
  notifications: AdminNotification[];
  unreadCount: number;
  total: number;
  page: number;
  pages: number;
  limit: number;
}

export interface NotificationsQuery {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}
