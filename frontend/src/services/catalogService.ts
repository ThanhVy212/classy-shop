import api from "./api";
import type { CatalogItem, CatalogType } from "../types/catalog";

export const catalogService = {
  async getItems(type?: CatalogType): Promise<CatalogItem[]> {
    const response = await api.get<{ items: CatalogItem[] }>("/catalog", {
      params: type ? { type } : undefined,
    });
    return response.data.items;
  },

  async createItem(
    type: CatalogType,
    name: string,
    description?: string,
  ): Promise<CatalogItem> {
    const response = await api.post<{ item: CatalogItem }>("/catalog", {
      type,
      name,
      description,
    });
    return response.data.item;
  },

  async updateItem(
    id: string,
    data: { name?: string; description?: string; isActive?: boolean },
  ): Promise<CatalogItem> {
    const response = await api.put<{ item: CatalogItem }>(
      `/catalog/${id}`,
      data,
    );
    return response.data.item;
  },

  async deleteItem(id: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/catalog/${id}`);
    return response.data;
  },
};

export default catalogService;
