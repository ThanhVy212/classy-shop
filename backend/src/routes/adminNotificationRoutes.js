import express from "express";
import { isAdmin, protectedRoute } from "../middlewares/authMiddleware.js";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../controller/notificationController.js";

const router = express.Router();

// Every admin notification route requires an authenticated administrator.
router.use(protectedRoute, isAdmin);

// @route GET /api/admin/notifications
// @desc List admin notifications and the unread count
// @access Private/admin
router.get("/", getNotifications);

// @route PATCH /api/admin/notifications/read-all
// @desc Mark every notification as read for the current admin
// @access Private/admin
router.patch("/read-all", markAllNotificationsRead);

// @route PATCH /api/admin/notifications/:id/read
// @desc Mark one notification as read for the current admin
// @access Private/admin
router.patch("/:id/read", markNotificationRead);

export default router;
