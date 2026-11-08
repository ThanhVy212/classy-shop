import mongoose from "mongoose";
import Product from "../models/Product.js";
import {
  applyStockChange,
  bulkUpdateStock,
  buildInventoryTemplateCsv,
  exportInventoryCsv,
  getLowStockAlerts,
  importInventoryCsv,
  listInventory,
  listInventoryHistory,
} from "../services/inventoryService.js";

const sendError = (res, error, fallback) => {
  if (Number.isInteger(error?.status)) {
    return res.status(error.status).json({ message: error.message });
  }

  console.error(fallback, error);
  return res.status(500).json({ message: fallback });
};

const getDatePart = () => new Date().toISOString().slice(0, 10);

/**
 * GET /api/admin/inventory
 * One row per size/color variant (or one row per product without variants),
 * with search, filters and pagination.
 */
export const getInventory = async (req, res) => {
  try {
    const data = await listInventory({
      search: req.query.search,
      category: req.query.category,
      status: req.query.status,
      sort: req.query.sort,
      page: req.query.page,
      limit: req.query.limit,
    });

    return res.status(200).json(data);
  } catch (error) {
    return sendError(res, error, "Could not load inventory.");
  }
};

/**
 * GET /api/admin/inventory/low-stock
 * Alerts for every row at or below LOW_STOCK_THRESHOLD.
 */
export const getLowStock = async (req, res) => {
  try {
    const data = await getLowStockAlerts({ limit: req.query.limit });
    return res.status(200).json(data);
  } catch (error) {
    return sendError(res, error, "Could not load low-stock alerts.");
  }
};

/**
 * GET /api/admin/inventory/history
 * Paginated stock-in / stock-out history.
 */
export const getInventoryHistory = async (req, res) => {
  try {
    const data = await listInventoryHistory({
      page: req.query.page,
      limit: req.query.limit,
      type: req.query.type,
      productId: req.query.productId,
      search: req.query.search,
      from: req.query.from,
      to: req.query.to,
    });

    return res.status(200).json(data);
  } catch (error) {
    return sendError(res, error, "Could not load inventory history.");
  }
};

/**
 * POST /api/admin/inventory/adjust
 * Adjust a single inventory row. mode: set | increase | decrease.
 */
export const adjustInventory = async (req, res) => {
  try {
    const {
      productId,
      size = "",
      color = "",
      mode = "set",
      value,
      stock,
      quantity,
      reason = "",
      note = "",
    } = req.body ?? {};

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: "A valid productId is required." });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    const result = await applyStockChange({
      product,
      size,
      color,
      mode,
      value: value ?? stock ?? quantity,
      reason: reason || "Manual inventory adjustment",
      note,
      source: "manual",
      performedBy: req.user._id,
      performedByName: req.user.name || req.user.email || "Administrator",
    });

    return res.status(200).json({
      message: result.skipped
        ? "Stock is already at that value."
        : "Stock updated successfully.",
      ...result,
    });
  } catch (error) {
    return sendError(res, error, "Could not update stock.");
  }
};

/**
 * PATCH /api/admin/inventory/bulk
 * Apply the same mode/value to many selected rows at once.
 */
export const bulkUpdateInventory = async (req, res) => {
  try {
    const { items, mode = "set", reason = "", note = "" } = req.body ?? {};

    const data = await bulkUpdateStock({
      items,
      mode,
      reason,
      note,
      performedBy: req.user._id,
      performedByName: req.user.name || req.user.email || "Administrator",
    });

    return res.status(200).json({
      message: `${data.updated} row(s) updated${
        data.failed ? `, ${data.failed} failed` : ""
      }.`,
      ...data,
    });
  } catch (error) {
    return sendError(res, error, "Could not run the bulk stock update.");
  }
};

/**
 * POST /api/admin/inventory/import
 * Imports a CSV file (multipart "file") or a raw CSV body { csv }.
 */
export const importInventory = async (req, res) => {
  try {
    const csvText = req.file
      ? req.file.buffer.toString("utf8")
      : String(req.body?.csv || "");

    const data = await importInventoryCsv({
      csvText,
      reason: String(req.body?.reason || "").trim() || "CSV stock import",
      note: String(req.body?.note || "").trim(),
      performedBy: req.user._id,
      performedByName: req.user.name || req.user.email || "Administrator",
    });

    return res.status(200).json({
      message: `${data.updated} row(s) imported${
        data.failed ? `, ${data.failed} skipped` : ""
      }.`,
      ...data,
    });
  } catch (error) {
    return sendError(res, error, "Could not import the CSV file.");
  }
};

/**
 * GET /api/admin/inventory/export
 * Downloads the current inventory (honouring the same filters as the table).
 */
export const exportInventory = async (req, res) => {
  try {
    const { csv, count } = await exportInventoryCsv({
      search: req.query.search,
      category: req.query.category,
      status: req.query.status,
      sort: req.query.sort,
    });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="inventory-${getDatePart()}.csv"`,
    );
    res.setHeader("X-Inventory-Rows", String(count));

    return res.status(200).send(csv);
  } catch (error) {
    return sendError(res, error, "Could not export inventory.");
  }
};

/**
 * GET /api/admin/inventory/template
 * CSV template pre-filled with every current inventory row.
 */
export const downloadInventoryTemplate = async (_req, res) => {
  try {
    const csv = await buildInventoryTemplateCsv();

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="inventory-template-${getDatePart()}.csv"`,
    );

    return res.status(200).send(csv);
  } catch (error) {
    return sendError(res, error, "Could not build the CSV template.");
  }
};
