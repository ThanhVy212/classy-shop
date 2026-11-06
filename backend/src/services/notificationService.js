import Notification from "../models/Notification.js";
import { emitAdminNotification } from "../config/socket.js";

const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

const getCustomerName = (order) =>
  order?.shippingAddress?.fullName?.trim() ||
  order?.contactEmail?.trim() ||
  "A customer";

const getCustomerEmail = (order) =>
  String(order?.contactEmail || order?.user?.email || "")
    .trim()
    .toLowerCase();

/**
 * Creates a shared admin notification for an order event.
 *
 * Notification failures must never break the customer flow, so every error is
 * logged and swallowed here.
 */
export const createAdminNotification = async ({ type, order, reason } = {}) => {
  if (!order?._id) return null;

  try {
    const customerName = getCustomerName(order);
    const amount = roundMoney(order.totalPrice);

    let title;
    let message;

    if (type === "order_cancelled") {
      const trimmedReason = String(reason || "").trim().slice(0, 300);
      title = "Order cancelled by customer";
      message = `${customerName} cancelled order ${order.orderNumber}.`;
      if (trimmedReason) {
        message += ` Reason: ${trimmedReason}`;
      }
    } else {
      title = "New order received";
      message = `${customerName} placed order ${order.orderNumber} for $${amount.toFixed(2)}.`;
    }

    const notification = await Notification.create({
      type,
      title,
      message,
      order: order._id,
      orderNumber: order.orderNumber,
      customerName,
      customerEmail: getCustomerEmail(order),
      amount,
      readBy: [],
    });

    // Real-time push to every connected admin. The database write above is the
    // source of truth; clients that were offline fetch it on their next load.
    emitAdminNotification(notification);

    return notification;
  } catch (error) {
    console.error("Could not create admin notification:", error);
    return null;
  }
};
