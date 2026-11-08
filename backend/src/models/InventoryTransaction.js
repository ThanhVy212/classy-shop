import mongoose from "mongoose";

export const INVENTORY_MOVEMENT_TYPES = [
  "import",
  "export",
  "adjustment",
  "bulk_update",
  "csv_import",
  "order_out",
  "order_return",
];

export const INVENTORY_SOURCES = ["manual", "bulk", "csv", "order"];

/**
 * One immutable stock movement. Quantity is signed: positive for stock coming
 * in (import, return) and negative for stock going out (export, sale).
 *
 * previousStock and newStock are stored so the history page can show the exact
 * before/after values even after a product is edited later.
 */
const inventoryTransactionSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    productName: {
      type: String,
      default: "",
      trim: true,
    },
    productSku: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    sku: {
      type: String,
      default: "",
      trim: true,
    },
    size: {
      type: String,
      default: "",
      trim: true,
    },
    color: {
      type: String,
      default: "",
      trim: true,
    },
    type: {
      type: String,
      enum: INVENTORY_MOVEMENT_TYPES,
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: INVENTORY_SOURCES,
      default: "manual",
      index: true,
    },
    // Signed change: -3 means three units left the warehouse.
    quantity: {
      type: Number,
      required: true,
    },
    previousStock: {
      type: Number,
      required: true,
      min: 0,
    },
    newStock: {
      type: Number,
      required: true,
      min: 0,
    },
    reason: {
      type: String,
      default: "",
      trim: true,
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
    // Human-readable reference such as an order number or CSV batch id.
    reference: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    performedByName: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true },
);

inventoryTransactionSchema.index({ product: 1, createdAt: -1 });
inventoryTransactionSchema.index({ type: 1, createdAt: -1 });
inventoryTransactionSchema.index({ createdAt: -1 });

const InventoryTransaction = mongoose.model(
  "InventoryTransaction",
  inventoryTransactionSchema,
);

export default InventoryTransaction;
