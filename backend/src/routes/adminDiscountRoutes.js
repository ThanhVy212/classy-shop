import express from "express";
import { isAdmin, protectedRoute } from "../middlewares/authMiddleware.js";
import {
  createDiscount,
  deleteDiscount,
  getAllDiscounts,
  updateDiscountStatus,
} from "../controller/discountController.js";

const router = express.Router();

// Every discount management route requires an authenticated administrator.
router.use(protectedRoute, isAdmin);

// @route GET /api/admin/discounts
// @desc List and search discount codes
// @access Private/admin
router.get("/", getAllDiscounts);

// @route POST /api/admin/discounts
// @desc Create a percentage, fixed, or capped percentage discount
// @access Private/admin
router.post("/", createDiscount);

// @route PATCH /api/admin/discounts/:id/status
// @desc Activate or deactivate a discount code
// @access Private/admin
router.patch("/:id/status", updateDiscountStatus);

// @route DELETE /api/admin/discounts/:id
// @desc Delete a discount code
// @access Private/admin
router.delete("/:id", deleteDiscount);

export default router;
