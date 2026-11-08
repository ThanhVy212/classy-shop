import type { Pagination } from "./product";

export type InventoryStatus = "in_stock" | "low_stock" | "out_of_stock";

/** "attention" matches both low and out-of-stock rows. */
export type InventoryStatusFilter = InventoryStatus | "all" | "attention";

export type InventorySort =
  | "stockAsc"
  | "stockDesc"
  | "nameAsc"
  | "nameDesc"
  | "categoryAsc"
  | "updatedDesc";

export interface InventoryRow {
  rowId: string;
  productId: string;
  productName: string;
  productSku: string;
  sku: string;
  variantSku: string;
  size: string;
  color: string;
  stock: number;
  threshold: number;
  status: InventoryStatus;
  image: string;
  category: string;
  brand: string;
  variantCount: number;
  isVariant: boolean;
  updatedAt?: string;
}

export interface InventorySummary {
  totalProducts: number;
  totalRows: number;
  totalUnits: number;
  lowStockRows: number;
  outOfStockRows: number;
  threshold: number;
}

export interface InventoryQuery {
  search?: string;
  category?: string;
  status?: InventoryStatusFilter;
  sort?: InventorySort;
  page?: number;
  limit?: number;
}

export interface InventoryResponse {
  rows: InventoryRow[];
  pagination: Pagination;
  summary: InventorySummary;
  categories: string[];
  threshold: number;
}

export interface InventoryAlert {
  productId: string;
  productName: string;
  productSku: string;
  sku: string;
  size: string;
  color: string;
  stock: number;
  threshold: number;
  status: InventoryStatus;
  reason: string;
  title: string;
  message: string;
  at: string;
}

export interface LowStockResponse {
  alerts: InventoryAlert[];
  counts: {
    low: number;
    out: number;
    total: number;
  };
  threshold: number;
}

export type InventoryMovementType =
  | "import"
  | "export"
  | "adjustment"
  | "bulk_update"
  | "csv_import"
  | "order_out"
  | "order_return";

export type InventorySource = "manual" | "bulk" | "csv" | "order";

export interface InventoryHistoryEntry {
  _id: string;
  product: string;
  productName: string;
  productSku: string;
  sku: string;
  size: string;
  color: string;
  type: InventoryMovementType;
  source: InventorySource;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  note: string;
  reference: string;
  order?: string | null;
  performedBy?: string | null;
  performedByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryHistoryResponse {
  entries: InventoryHistoryEntry[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}

export interface InventoryHistoryQuery {
  page?: number;
  limit?: number;
  type?: InventoryMovementType | "all";
  productId?: string;
  search?: string;
  from?: string;
  to?: string;
}

export type StockChangeMode = "set" | "increase" | "decrease";

export interface AdjustStockPayload {
  productId: string;
  size?: string;
  color?: string;
  mode?: StockChangeMode;
  value: number;
  reason?: string;
  note?: string;
}

export interface InventoryAdjustResult {
  message: string;
  skipped: boolean;
  productId: string;
  sku: string;
  size: string;
  color: string;
  previousStock: number;
  newStock: number;
  status: InventoryStatus;
  threshold: number;
}

export interface BulkStockItem {
  productId: string;
  size?: string;
  color?: string;
  value?: number;
  stock?: number;
  quantity?: number;
  mode?: StockChangeMode;
  reason?: string;
}

export interface BulkUpdatePayload {
  items: BulkStockItem[];
  mode?: StockChangeMode;
  reason?: string;
  note?: string;
}

export interface InventoryMutationError {
  row: number;
  productId: string;
  message: string;
}

export interface BulkUpdateResult {
  message: string;
  updated: number;
  skipped: number;
  failed: number;
  total: number;
  errors: InventoryMutationError[];
  threshold: number;
  lowStock?: LowStockResponse;
}

export interface CsvImportError {
  line: number;
  sku: string;
  size: string;
  color: string;
  message: string;
}

export interface CsvImportResult {
  message: string;
  batchId: string;
  totalRows: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: CsvImportError[];
  threshold: number;
  lowStock?: LowStockResponse;
}
