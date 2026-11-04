import express from "express";
import { protectedRoute } from "../middlewares/authMiddleware.js";
import {
  cancelOrder,
  createOrder,
  getMyOrders,
  getOrderById,
} from "../controller/orderController.js";

const router = express.Router();

// @route POST /api/orders
// @desc Create a cash-on-delivery order from the signed-in user's cart
// @access Private
router.post("/", protectedRoute, createOrder);

// @route GET /api/orders
// @desc List the signed-in user's orders
// @access Private
router.get("/", protectedRoute, getMyOrders);

// @route GET /api/orders/:id
// @desc Get one of the signed-in user's orders (admins can read any)
// @access Private
router.get("/:id", protectedRoute, getOrderById);

// @route PATCH /api/orders/:id/cancel
// @desc Cancel an order while it is still processing
// @access Private
router.patch("/:id/cancel", protectedRoute, cancelOrder);

export default router;
