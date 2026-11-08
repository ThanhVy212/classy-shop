import express from "express";
import { isAdmin, protectedRoute } from "../middlewares/authMiddleware.js";
import { uploadInventoryCsv } from "../middlewares/inventoryUploadMiddleware.js";
import {
  adjustInventory,
  bulkUpdateInventory,
  downloadInventoryTemplate,
  exportInventory,
  getInventory,
  getInventoryHistory,
  getLowStock,
  importInventory,
} from "../controller/inventoryController.js";

const router = express.Router();

// Every inventory route requires an authenticated administrator.
router.use(protectedRoute, isAdmin);

// @route GET /api/admin/inventory/low-stock
// @desc Rows at or below the low-stock threshold
// @access Private/admin
router.get("/low-stock", getLowStock);

// @route GET /api/admin/inventory/history
// @desc Paginated stock-in / stock-out history
// @access Private/admin
router.get("/history", getInventoryHistory);

// @route GET /api/admin/inventory/export
// @desc Download inventory as CSV
// @access Private/admin
router.get("/export", exportInventory);

// @route GET /api/admin/inventory/template
// @desc Download the import template CSV
// @access Private/admin
router.get("/template", downloadInventoryTemplate);

// @route POST /api/admin/inventory/import
// @desc Import stock values from a CSV file
// @access Private/admin
router.post("/import", uploadInventoryCsv, importInventory);

// @route POST /api/admin/inventory/adjust
// @desc Adjust one inventory row
// @access Private/admin
router.post("/adjust", adjustInventory);

// @route PATCH /api/admin/inventory/bulk
// @desc Apply a stock change to many rows at once
// @access Private/admin
router.patch("/bulk", bulkUpdateInventory);

// @route GET /api/admin/inventory
// @desc Inventory rows with search, filters and pagination
// @access Private/admin
router.get("/", getInventory);

export default router;
