import mongoose from "mongoose";

export const NOTIFICATION_TYPES = ["order_created", "order_cancelled"];

const notificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
      trim: true,
    },
    customerName: {
      type: String,
      default: "",
      trim: true,
    },
    customerEmail: {
      type: String,
      default: "",
      trim: true,
    },
    amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Admin notifications are shared by every administrator. Read state is
    // tracked per admin so one admin reading a notification does not hide it
    // from the rest of the team.
    readBy: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ readBy: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
