import api from "./api";
import type { DashboardResponse } from "../types/dashboard";

export const dashboardService = {
  async getDashboard(): Promise<DashboardResponse> {
    const response = await api.get<DashboardResponse>("/admin/dashboard");
    return response.data;
  },
};

export default dashboardService;
