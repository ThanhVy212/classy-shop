import express from "express";
import { protectedRoute } from "../middlewares/authMiddleware.js";
import { validateDiscountForCheckout } from "../controller/discountController.js";

const router = express.Router();

// @route POST /api/discounts/validate
// @desc Preview a discount code for the signed-in customer's cart
// @access Private
router.post("/validate", protectedRoute, validateDiscountForCheckout);

export default router;
