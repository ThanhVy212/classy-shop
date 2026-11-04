import mongoose from "mongoose";

export const ORDER_STATUSES = ["Processing", "Shipped", "Delivered", "Cancelled"];
export const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"];
export const PAYMENT_METHODS = ["COD"];
export const SHIPPING_METHODS = ["standard", "express"];

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      default: "",
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    size: {
      type: String,
      default: "",
    },
    color: {
      type: String,
      default: "",
    },
  },
  { _id: false },
);

const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    apartment: { type: String, default: "", trim: true },
    city: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ORDER_STATUSES,
      required: true,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false },
);

const paymentHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: PAYMENT_STATUSES,
      required: true,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Human friendly identifier shown to customers and admins, e.g. CS-260104-8F3K2Q
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    orderItems: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: "An order must contain at least one item",
      },
    },
    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },
    contactEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      default: "COD",
    },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: "pending",
      index: true,
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    refundedAt: {
      type: Date,
      default: null,
    },
    orderStatus: {
      type: String,
      enum: ORDER_STATUSES,
      default: "Processing",
      index: true,
    },
    isDelivered: {
      type: Boolean,
      default: false,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelReason: {
      type: String,
      default: "",
      trim: true,
    },
    shippingMethod: {
      type: String,
      enum: SHIPPING_METHODS,
      default: "standard",
    },
    itemsPrice: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    shippingPrice: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    taxPrice: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    discountAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    promoCode: {
      type: String,
      default: null,
      uppercase: true,
      trim: true,
    },
    totalPrice: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
    paymentHistory: {
      type: [paymentHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });

orderSchema.virtual("itemsCount").get(function () {
  return this.orderItems.reduce(
    (total, item) => total + (Number(item.quantity) || 0),
    0,
  );
});

const Order = mongoose.model("Order", orderSchema);

export default Order;
