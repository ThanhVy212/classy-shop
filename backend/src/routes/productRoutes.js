import express from "express";
import { protectedRoute, isAdmin } from "../middlewares/authMiddleware.js";
import {
  createProduct,
  deleteProduct,
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

export default router;
