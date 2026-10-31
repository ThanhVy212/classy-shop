export type CatalogType = "category" | "brand" | "material";

export interface CatalogItem {
  _id: string;
  type: CatalogType;
  name: string;
  description?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const CATALOG_TYPE_LABELS: Record<CatalogType, string> = {
  category: "Category",
  brand: "Brand",
  material: "Material",
};

export const CATALOG_TYPES: CatalogType[] = ["category", "brand", "material"];
