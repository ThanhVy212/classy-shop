import express from "express";
import { protectedRoute, isAdmin } from "../middlewares/authMiddleware.js";
import {
  createProduct,
  deleteProduct,
  getBestsellerProduct,
  getNewarrivalsProduct,
  getProductById,
  getProducts,
  getSimilarProductById,
  updateProduct,
} from "../controller/productController.js";

const router = express.Router();

// @route POST /api/products
// @desc Create a new product
// @access Private/admin
router.post("/", protectedRoute, isAdmin, createProduct);

// @route PUT /api/products/:id
// @desc Update an existing product ID
// @access Private/admin
router.put("/:id", protectedRoute, isAdmin, updateProduct);

// @route DELETE /api/products/id
// @desc Delete an existing product by ID
// @access Private/ admin
router.delete("/:id", protectedRoute, isAdmin, deleteProduct);

// @route GET /api/products
// @desc Get all products with optional query  filters
// @access Public
router.get("/", getProducts);

// @route GET /api/products/similar/:id
// @desc Retrevieve similar products based on the current product's gender and categoory
// @access Public
router.get("/similar/:id", getSimilarProductById);

// @route GET /api/products/best-seller
// @desc Retrevieve the product with highest rating
// @access Public
router.get("/best-seller", getBestsellerProduct);

// @route GET /api/products/new-arrivals
// @desc Retrevieve lastet 8 products - Create date
// @access Public
router.get("/new-arrivals", getNewarrivalsProduct);

// @route GET /api/products/:id
// @desc Get an existing product by ID
// @access Public
router.get("/:id", getProductById);

export default router;
