import mongoose from "mongoose";
import Notification from "../models/Notification.js";

const parsePositiveInt = (value, fallback, max) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return max ? Math.min(parsed, max) : parsed;
};

const isReadBy = (notification, userId) =>
  (notification.readBy ?? []).some(
    (readerId) => String(readerId) === String(userId),
  );

/**
 * GET /api/admin/notifications
 * Newest admin notifications, with the unread count for the current admin.
 */
export const getNotifications = async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(req.query.limit, 15, 50);
    const unreadOnly = ["true", "1"].includes(
      String(req.query.unreadOnly || "").toLowerCase(),
    );
    const userId = req.user._id;

    const filter = unreadOnly ? { readBy: { $ne: userId } } : {};

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Notification.countDocuments(filter),
      Notification.countDocuments({ readBy: { $ne: userId } }),
    ]);

    return res.status(200).json({
      notifications: notifications.map((notification) => ({
        ...notification.toObject(),
        isRead: isReadBy(notification, userId),
      })),
      unreadCount,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      limit,
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    return res
      .status(500)
      .json({ message: "Could not load notifications." });
  }
};

/**
 * PATCH /api/admin/notifications/read-all
 * Marks every notification as read for the current admin.
 */
export const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } },
    );

    return res.status(200).json({ unreadCount: 0 });
  } catch (error) {
    console.error("Mark all notifications read error:", error);
    return res
      .status(500)
      .json({ message: "Could not update notifications." });
  }
};

/**
 * PATCH /api/admin/notifications/:id/read
 * Marks one notification as read for the current admin.
 */
export const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: "Notification not found." });
    }

    const notification = await Notification.findByIdAndUpdate(
      id,
      { $addToSet: { readBy: req.user._id } },
      { new: true },
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found." });
    }

    const unreadCount = await Notification.countDocuments({
      readBy: { $ne: req.user._id },
    });

    return res.status(200).json({ unreadCount });
  } catch (error) {
    console.error("Mark notification read error:", error);
    return res
      .status(500)
      .json({ message: "Could not update the notification." });
  }
};
