export interface ProductImage {
  url: string;
  altText?: string;
  _id?: string;
}

export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  countInStock: number;
  sku: string;
  category: string;
  brand?: string;
  sizes: string[];
  colors: string[];
  collections: string;
  material?: string;
  gender?: "Men" | "Women" | "Unisex" | string;
  images: ProductImage[];
  isFeatured?: boolean;
  isPublished?: boolean;
  rating?: number;
  numReviews?: number;
  tags?: string[];
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  weight?: number;
  createdAt?: string;
  updatedAt?: string;

  // For compatibility with mock data / legacy fields
  image?: string;
  productId?: number | string;
  size?: string;
  color?: string;
  quantity?: number;
}

export interface ProductsQuery {
  collection?: string;
  size?: string;
  color?: string;
  gender?: string;
  minPrice?: number | string;
  maxPrice?: number | string;
  sortBy?: "priceAsc" | "priceDesc" | "popularity" | string;
  search?: string;
  category?: string;
  material?: string;
  brand?: string;
  page?: number | string;
  limit?: number | string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ProductsResponse {
  products: Product[];
  pagination: Pagination;
}
