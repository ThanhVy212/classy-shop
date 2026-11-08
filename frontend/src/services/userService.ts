import api from "./api";
import type {
  AdminUser,
  AdminUsersQuery,
  AdminUsersResponse,
  CreateUserPayload,
} from "../types/user";
import type { UserRole } from "../types/auth";

const cleanParams = (params?: AdminUsersQuery) => {
  if (!params) return undefined;

  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) =>
        value !== undefined && value !== null && value !== "" && value !== "all"
    )
  );
};

export const userService = {
  async getUsers(params?: AdminUsersQuery): Promise<AdminUsersResponse> {
    const response = await api.get<AdminUsersResponse>("/admin/users", {
      params: cleanParams(params),
    });
    return response.data;
  },

  async createUser(payload: CreateUserPayload): Promise<AdminUser> {
    const response = await api.post<{ message: string; user: AdminUser }>(
      "/admin/users",
      payload
    );
    return response.data.user;
  },

  async updateUserRole(id: string, role: UserRole): Promise<AdminUser> {
    const response = await api.patch<{ message: string; user: AdminUser }>(
      `/admin/users/${id}/role`,
      { role }
    );
    return response.data.user;
  },

  async deleteUser(id: string): Promise<void> {
    await api.delete(`/admin/users/${id}`);
  },
};

export default userService;
