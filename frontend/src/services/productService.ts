import api from "./api";
import type { Product, ProductsQuery, ProductsResponse } from "../types/product";

export const productService = {
  async getProducts(params?: ProductsQuery): Promise<ProductsResponse> {
    const response = await api.get<ProductsResponse>("/products", { params });
    return response.data;
  },

  async getProductById(id: string): Promise<Product> {
    const response = await api.get<{ product: Product }>(`/products/${id}`);
    return response.data.product;
  },

  async getSimilarProducts(id: string): Promise<Product[]> {
    const response = await api.get<{ similarProducts: Product[] }>(
      `/products/similar/${id}`
    );
    return response.data.similarProducts;
  },

  async getBestSeller(): Promise<Product> {
    const response = await api.get<{ bestSeller: Product }>(
      "/products/best-seller"
    );
    return response.data.bestSeller;
  },

  async getNewArrivals(): Promise<Product[]> {
    const response = await api.get<{ newArrivals: Product[] }>(
      "/products/new-arrivals"
    );
    return response.data.newArrivals;
  },

  async createProduct(data: Partial<Product>): Promise<Product> {
    const response = await api.post<Product>("/products", data);
    return response.data;
  },

  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    const response = await api.put<{ message: string; product: Product }>(
      `/products/${id}`,
      data
    );
    return response.data.product;
  },

  async deleteProduct(id: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/products/${id}`);
    return response.data;
  },
};

export default productService;
