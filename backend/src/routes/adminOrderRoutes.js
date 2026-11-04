import express from "express";
import { isAdmin, protectedRoute } from "../middlewares/authMiddleware.js";
import {
  getAllOrders,
  getOrderById,
  getOrderStats,
  updateOrderStatus,
  updatePaymentStatus,
} from "../controller/orderController.js";

const router = express.Router();

// Every admin order route requires an authenticated administrator.
router.use(protectedRoute, isAdmin);

// @route GET /api/admin/orders/stats
// @desc Order counters and paid revenue for the dashboard
// @access Private/admin
// Must stay above "/:id" so "stats" is not treated as an order id.
router.get("/stats", getOrderStats);

// @route GET /api/admin/orders
// @desc Search, filter and paginate all orders
// @access Private/admin
router.get("/", getAllOrders);

// @route GET /api/admin/orders/:id
// @desc Read any order
// @access Private/admin
router.get("/:id", getOrderById);

// @route PATCH /api/admin/orders/:id/status
// @desc Update fulfilment status
// @access Private/admin
router.patch("/:id/status", updateOrderStatus);

// @route PATCH /api/admin/orders/:id/payment
// @desc Update payment status
// @access Private/admin
router.patch("/:id/payment", updatePaymentStatus);

export default router;
