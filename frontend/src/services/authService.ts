import api from "./api";
import type { LoginFormData, RegisterFormData } from "../validations/auth";
import type { AuthResponse, ProfileResponse } from "../types/auth";
import axios from "axios";

export const authService = {
  async register(data: RegisterFormData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/auth/register", data);
    return response.data;
  },

  async login(data: LoginFormData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/auth/login", data);
    return response.data;
  },

  async logout(): Promise<void> {
    await api.post("/auth/logout");
  },

  async refreshToken(): Promise<{ accessToken: string }> {
    const response = await api.post<{ accessToken: string }>("/auth/refresh");
    return response.data;
  },

  async getProfile(): Promise<ProfileResponse> {
    const response = await api.get<ProfileResponse>("/auth/me");
    return response.data;
  },
};

export const getApiErrorMessage = (error: unknown, fallbackMessage = "An unexpected error occurred"): string => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || fallbackMessage;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallbackMessage;
};
