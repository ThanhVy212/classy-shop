import api from "./api";
import type {
  AdjustStockPayload,
  BulkUpdatePayload,
  BulkUpdateResult,
  CsvImportResult,
  InventoryAdjustResult,
  InventoryHistoryQuery,
  InventoryHistoryResponse,
  InventoryQuery,
  InventoryResponse,
  LowStockResponse,
} from "../types/inventory";

export const inventoryService = {
  async getInventory(params?: InventoryQuery): Promise<InventoryResponse> {
    const response = await api.get<InventoryResponse>("/admin/inventory", {
      params,
    });
    return response.data;
  },

  async getLowStock(limit = 50): Promise<LowStockResponse> {
    const response = await api.get<LowStockResponse>(
      "/admin/inventory/low-stock",
      { params: { limit } }
    );
    return response.data;
  },

  async getHistory(
    params?: InventoryHistoryQuery
  ): Promise<InventoryHistoryResponse> {
    const response = await api.get<InventoryHistoryResponse>(
      "/admin/inventory/history",
      {
        params: {
          ...params,
          type: params?.type === "all" ? undefined : params?.type,
        },
      }
    );
    return response.data;
  },

  async adjustStock(
    payload: AdjustStockPayload
  ): Promise<InventoryAdjustResult> {
    const response = await api.post<InventoryAdjustResult>(
      "/admin/inventory/adjust",
      payload
    );
    return response.data;
  },

  async bulkUpdate(payload: BulkUpdatePayload): Promise<BulkUpdateResult> {
    const response = await api.patch<BulkUpdateResult>(
      "/admin/inventory/bulk",
      payload
    );
    return response.data;
  },

  async importCsv(
    file: File,
    options: { reason?: string; note?: string } = {}
  ): Promise<CsvImportResult> {
    const formData = new FormData();
    formData.append("file", file);

    if (options.reason) formData.append("reason", options.reason);
    if (options.note) formData.append("note", options.note);

    const response = await api.post<CsvImportResult>(
      "/admin/inventory/import",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return response.data;
  },

  async exportCsv(params?: InventoryQuery): Promise<Blob> {
    const response = await api.get<Blob>("/admin/inventory/export", {
      params,
      responseType: "blob",
    });
    return response.data;
  },

  async getTemplate(): Promise<Blob> {
    const response = await api.get<Blob>("/admin/inventory/template", {
      responseType: "blob",
    });
    return response.data;
  },
};

export default inventoryService;
