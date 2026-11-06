import api from "./api";
import type {
  NotificationsQuery,
  NotificationsResponse,
} from "../types/notification";

export const notificationService = {
  async getNotifications(
    params?: NotificationsQuery
  ): Promise<NotificationsResponse> {
    const response = await api.get<NotificationsResponse>(
      "/admin/notifications",
      {
        params: {
          page: params?.page,
          limit: params?.limit,
          unreadOnly: params?.unreadOnly || undefined,
        },
      }
    );
    return response.data;
  },

  async markAsRead(id: string): Promise<number> {
    const response = await api.patch<{ unreadCount: number }>(
      `/admin/notifications/${id}/read`
    );
    return response.data.unreadCount;
  },

  async markAllAsRead(): Promise<number> {
    const response = await api.patch<{ unreadCount: number }>(
      "/admin/notifications/read-all"
    );
    return response.data.unreadCount;
  },
};

export default notificationService;
