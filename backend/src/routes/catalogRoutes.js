import express from "express";
import {
  createCatalogItem,
  deleteCatalogItem,
  getCatalogItems,
  updateCatalogItem,
} from "../controller/catalogController.js";
import { isAdmin, protectedRoute } from "../middlewares/authMiddleware.js";
import { validateObjectId } from "../middlewares/validate.js";

const router = express.Router();

// @route GET /api/catalog?type=category|brand|material
// @desc Get catalog values used by product forms and storefront filters
// @access Public
router.get("/", getCatalogItems);

// @route POST /api/catalog
// @desc Create a new category, brand, or material
// @access Private/admin
router.post("/", protectedRoute, isAdmin, createCatalogItem);

// @route PUT /api/catalog/:id
// @desc Rename/update a catalog value
// @access Private/admin
router.put(
  "/:id",
  protectedRoute,
  isAdmin,
  validateObjectId(),
  updateCatalogItem,
);

// @route DELETE /api/catalog/:id
// @desc Delete an unused catalog value
// @access Private/admin
router.delete(
  "/:id",
  protectedRoute,
  isAdmin,
  validateObjectId(),
  deleteCatalogItem,
);

export default router;
