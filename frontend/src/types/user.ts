import type { UserRole } from "./auth";

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  isEmailVerified?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface AdminUsersQuery {
  search?: string;
  role?: UserRole | "all";
}

export interface AdminUsersResponse {
  users: AdminUser[];
  total: number;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}
