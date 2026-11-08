import mongoose from "mongoose";
import crypto from "crypto";
import Cart from "../models/Cart.js";
import Order, {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
} from "../models/Order.js";
import Product from "../models/Product.js";
import {
  calculateDiscountAmount,
  findDiscountByCode,
  getMinimumOrderAmount,
  meetsMinimumOrder,
  normalizeDiscountCode,
  recordDiscountUsage,
} from "../services/discountService.js";
import { createAdminNotification } from "../services/notificationService.js";
import { recordOrderStockMovements } from "../services/inventoryService.js";
import {
  findVariant,
  getAvailableStock,
  hasVariants,
} from "../services/variantService.js";

const TAX_RATE = 0.08;
const EXPRESS_SHIPPING_PRICE = 15;

const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

const getEffectivePrice = (product) => {
  const price = Number(product?.price);
  const discountPrice = Number(product?.discountPrice);

  if (
    Number.isFinite(discountPrice) &&
    discountPrice > 0 &&
    (!Number.isFinite(price) || discountPrice < price)
  ) {
    return discountPrice;
  }

  return Number.isFinite(price) && price > 0 ? price : 0;
};

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parsePositiveInt = (value, fallback, max) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return max ? Math.min(parsed, max) : parsed;
};

const generateOrderNumber = () => {
  const now = new Date();
  const datePart = [
    String(now.getFullYear()).slice(-2),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const randomPart = crypto.randomBytes(4).toString("hex").toUpperCase();

  return `CS-${datePart}-${randomPart}`;
};

const normalizeShippingAddress = (input = {}) => {
  const safeInput =
    input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const field = (value) => (typeof value === "string" ? value.trim() : "");

  return {
    fullName: field(safeInput.fullName),
    phone: field(safeInput.phone),
    address: field(safeInput.address),
    apartment: field(safeInput.apartment),
    city: field(safeInput.city),
    postalCode: field(safeInput.postalCode),
    country: field(safeInput.country),
  };
};

const validateCreateOrderPayload = ({ contactEmail, shippingAddress, shippingMethod, paymentMethod }) => {
  const errors = [];

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail || "")) {
    errors.push("A valid contact email is required.");
  }

  const requiredAddressFields = [
    ["fullName", "Full name"],
    ["phone", "Phone number"],
    ["address", "Street address"],
    ["city", "City"],
    ["postalCode", "Postal / ZIP code"],
    ["country", "Country"],
  ];

  requiredAddressFields.forEach(([key, label]) => {
    if (!shippingAddress[key]) errors.push(`${label} is required.`);
  });

  if (shippingMethod && !["standard", "express"].includes(shippingMethod)) {
    errors.push("Invalid shipping method.");
  }

  if (paymentMethod && paymentMethod !== "COD") {
    errors.push(
      "Only cash on delivery is available right now. Other payment methods are coming soon.",
    );
  }

  return errors;
};

/**
 * Atomically reserve stock for one order line. Products with variants use the
 * positional $ operator so two customers cannot buy the last unit of the same
 * size/color. Legacy products keep reserving from countInStock.
 *
 * countInStock is decremented alongside the variant because Mongo update
 * operators skip the model's pre-validate hook that normally keeps the total
 * in sync.
 */
const reserveItemStock = async (item, product) => {
  if (hasVariants(product)) {
    const result = await Product.updateOne(
      {
        _id: item.productId,
        variants: {
          $elemMatch: {
            size: item.size,
            color: item.color,
            stock: { $gte: item.quantity },
          },
        },
      },
      {
        $inc: {
          "variants.$.stock": -item.quantity,
          countInStock: -item.quantity,
        },
      },
    );

    return result.modifiedCount === 1;
  }

  const result = await Product.updateOne(
    {
      _id: item.productId,
      countInStock: { $gte: item.quantity },
    },
    { $inc: { countInStock: -item.quantity } },
  );

  return result.modifiedCount === 1;
};

/**
 * Give an order line's quantity back. Variant products restore the matching
 * size/color; if that variant no longer exists (the admin edited the product
 * after the order) the quantity falls back to the product-level count.
 */
const incrementItemStock = async (item) => {
  const quantity = Math.abs(Number(item.quantity) || 0);
  if (!quantity) return;

  const product = await Product.findById(item.productId).select("variants");

  if (!product) return;

  if (hasVariants(product)) {
    const result = await Product.updateOne(
      {
        _id: item.productId,
        variants: { $elemMatch: { size: item.size, color: item.color } },
      },
      {
        $inc: {
          "variants.$.stock": quantity,
          countInStock: quantity,
        },
      },
    );

    if (result.modifiedCount === 1) return;
  }

  await Product.updateOne(
    { _id: item.productId },
    { $inc: { countInStock: quantity } },
  );
};

const restoreReservedStock = async (items) => {
  await Promise.all(items.map((item) => incrementItemStock(item)));
};

const restoreStock = async (order) => {
  const quantities = new Map();

  order.orderItems.forEach((item) => {
    const key = `${item.productId}::${item.size || ""}::${item.color || ""}`;
    const existing = quantities.get(key);

    quantities.set(key, {
      productId: item.productId,
      size: item.size || "",
      color: item.color || "",
      quantity: (existing?.quantity || 0) + (Number(item.quantity) || 0),
    });
  });

  await restoreReservedStock(Array.from(quantities.values()));
};

/**
 * POST /api/orders
 * Creates a cash-on-delivery order from the signed-in customer's cart.
 * Prices, discounts, tax and totals are always recomputed here; the client
 * payload is never trusted for money values.
 */
export const createOrder = async (req, res) => {
  const userId = req.user._id;
  const {
    contactEmail,
    shippingAddress: rawShippingAddress,
    shippingMethod = "standard",
    paymentMethod = "COD",
    promoCode: rawPromoCode,
    notes,
  } = req.body ?? {};

  const shippingAddress = normalizeShippingAddress(rawShippingAddress);
  const normalizedEmail = String(contactEmail || req.user.email || "")
    .trim()
    .toLowerCase();

  const validationErrors = validateCreateOrderPayload({
    contactEmail: normalizedEmail,
    shippingAddress,
    shippingMethod,
    paymentMethod,
  });

  if (validationErrors.length > 0) {
    return res.status(400).json({
      message: validationErrors[0],
      errors: validationErrors,
    });
  }

  const cart = await Cart.findOne({ user: userId });

  if (!cart || cart.products.length === 0) {
    return res.status(400).json({ message: "Your bag is empty." });
  }

  try {
    const productIds = Array.from(
      new Set(cart.products.map((item) => String(item.productId))),
    );

    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(
      products.map((product) => [String(product._id), product]),
    );

    const orderItems = [];

    for (const cartItem of cart.products) {
      const product = productMap.get(String(cartItem.productId));

      if (!product) {
        return res.status(400).json({
          message: `${cartItem.name || "An item"} is no longer available.`,
        });
      }

      const quantity = Math.floor(Number(cartItem.quantity));

      if (!Number.isFinite(quantity) || quantity < 1) {
        return res.status(400).json({
          message: `Invalid quantity for ${product.name}.`,
        });
      }

      const size = cartItem.size || "";
      const color = cartItem.color || "";
      const variantLabel =
        size || color
          ? ` in ${[size, color].filter(Boolean).join(" / ")}`
          : "";

      const matchedVariant = hasVariants(product)
        ? findVariant(product, size, color)
        : null;

      if (hasVariants(product) && !matchedVariant) {
        return res.status(400).json({
          message: `${product.name}${variantLabel} is no longer available.`,
        });
      }

      const available = getAvailableStock(product, size, color);

      if (quantity > available) {
        return res.status(409).json({
          message:
            available > 0
              ? `${product.name}${variantLabel} only has ${available} left in stock.`
              : `${product.name}${variantLabel} is out of stock.`,
        });
      }

      // Use the canonical size/color from the matched variant so the stored
      // values are identical to what reserveItemStock and incrementItemStock
      // use when querying the variants array. Fall back to the cart values for
      // non-variant products.
      const canonicalSize = matchedVariant ? matchedVariant.size : size;
      const canonicalColor = matchedVariant ? matchedVariant.color : color;

      orderItems.push({
        productId: product._id,
        name: product.name,
        image: product.images?.[0]?.url || cartItem.image || "",
        price: getEffectivePrice(product),
        quantity,
        size: canonicalSize,
        color: canonicalColor,
      });
    }

    const itemsPrice = roundMoney(
      orderItems.reduce(
        (total, item) => total + item.price * item.quantity,
        0,
      ),
    );

    const shippingPrice =
      shippingMethod === "express" ? EXPRESS_SHIPPING_PRICE : 0;
    const taxPrice = roundMoney(itemsPrice * TAX_RATE);

    let promoCode = null;
    let discountAmount = 0;
    let appliedDiscount = null;
    const requestedPromo = normalizeDiscountCode(rawPromoCode);

    if (requestedPromo) {
      const discount = await findDiscountByCode(requestedPromo, {
        activeOnly: true,
      });

      if (!discount) {
        return res.status(400).json({
          message: "That discount code is invalid or has expired.",
        });
      }

      if (!meetsMinimumOrder(discount, itemsPrice)) {
        return res.status(400).json({
          message: `This discount code requires a minimum order of $${getMinimumOrderAmount(
            discount,
          ).toFixed(2)}.`,
        });
      }

      discountAmount = calculateDiscountAmount(discount, itemsPrice);

      if (discountAmount <= 0) {
        return res.status(400).json({
          message:
            "This discount code cannot be applied to your current order.",
        });
      }

      promoCode = discount.code;
      appliedDiscount = discount;
    }

    const totalPrice = roundMoney(
      Math.max(
        0,
        itemsPrice + shippingPrice + taxPrice - discountAmount,
      ),
    );

    // Reserve stock with conditional updates so two customers cannot buy the
    // same last item (or last size/color) at the same time. Any failed update
    // rolls the earlier reservations back.
    const reservedItems = [];

    for (const item of orderItems) {
      const product = productMap.get(String(item.productId));
      const reserved = await reserveItemStock(item, product);

      if (!reserved) {
        await restoreReservedStock(reservedItems);
        return res.status(409).json({
          message: `${item.name} just went out of stock. Please review your bag.`,
        });
      }

      reservedItems.push(item);
    }

    const now = new Date();
    const order = new Order({
      user: userId,
      orderNumber: generateOrderNumber(),
      orderItems,
      shippingAddress,
      contactEmail: normalizedEmail,
      paymentMethod: "COD",
      paymentStatus: "pending",
      isPaid: false,
      orderStatus: "Processing",
      isDelivered: false,
      shippingMethod,
      itemsPrice,
      shippingPrice,
      taxPrice,
      discountAmount,
      promoCode,
      totalPrice,
      statusHistory: [
        {
          status: "Processing",
          changedAt: now,
          note: notes ? String(notes).slice(0, 500) : "Order placed",
        },
      ],
      paymentHistory: [
        {
          status: "pending",
          changedAt: now,
          note: "Cash on delivery â€” payment collected on delivery",
        },
      ],
    });

    try {
      await order.save();
    } catch (error) {
      // Release the stock reserved above; the order was not created.
      await restoreReservedStock(reservedItems);
      throw error;
    }

    if (appliedDiscount) {
      try {
        await recordDiscountUsage(appliedDiscount._id);
      } catch (usageError) {
        console.error("Could not record discount usage:", usageError);
      }
    }

    // The bag has been converted into an order. A failure to clear it must not
    // fail the order: the customer has already been charged stock.
    try {
      cart.products = [];
      cart.totalPrice = 0;
      await cart.save();
    } catch (cartError) {
      console.error("Could not clear cart after order:", cartError);
    }

    // Let the admin team know a new order came in. This never throws, so a
    // notification problem cannot fail an order that was already saved.
    await createAdminNotification({ type: "order_created", order });

    // Record the stock reserved above as an "out" movement. Failures are
    // logged inside the service and never block the order.
    await recordOrderStockMovements({
      order,
      items: reservedItems,
      type: "order_out",
    });

    let populatedOrder = null;
    try {
      populatedOrder = await Order.findById(order._id).populate(
        "user",
        "name email",
      );
    } catch (populateError) {
      console.error("Could not populate created order:", populateError);
    }

    return res.status(201).json({ order: populatedOrder ?? order });
  } catch (error) {
    console.error("Create order error:", error);
    return res.status(500).json({ message: "Could not place your order." });
  }
};

/**
 * GET /api/orders
 * Returns the signed-in customer's orders, newest first.
 */
export const getMyOrders = async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(req.query.limit, 10, 50);
    const { status, paymentStatus, search } = req.query;

    const filter = { user: req.user._id };

    if (status && ORDER_STATUSES.includes(status)) {
      filter.orderStatus = status;
    }

    if (paymentStatus && PAYMENT_STATUSES.includes(paymentStatus)) {
      filter.paymentStatus = paymentStatus;
    }

    if (search && String(search).trim()) {
      const regex = new RegExp(escapeRegex(String(search).trim()), "i");
      filter.$or = [
        { orderNumber: regex },
        { contactEmail: regex },
        { "shippingAddress.fullName": regex },
      ];
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("user", "name email"),
      Order.countDocuments(filter),
    ]);

    return res.status(200).json({
      orders,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      total,
      limit,
    });
  } catch (error) {
    console.error("Get my orders error:", error);
    return res.status(500).json({ message: "Could not load your orders." });
  }
};

/**
 * GET /api/orders/:id
 * Admins can read any order; customers only their own.
 */
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: "Order not found." });
    }

    const order = await Order.findById(id).populate("user", "name email");

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    const ownerId = String(order.user?._id ?? order.user);

    if (req.user.role !== "admin" && ownerId !== String(req.user._id)) {
      // Do not reveal that the order exists.
      return res.status(404).json({ message: "Order not found." });
    }

    return res.status(200).json({ order });
  } catch (error) {
    console.error("Get order error:", error);
    return res.status(500).json({ message: "Could not load this order." });
  }
};

/**
 * PATCH /api/orders/:id/cancel
 * A customer can cancel their own order while it is still processing.
 */
export const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: "Order not found." });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    const ownerId = String(order.user);

    if (req.user.role !== "admin" && ownerId !== String(req.user._id)) {
      return res.status(404).json({ message: "Order not found." });
    }

    if (order.orderStatus === "Cancelled") {
      return res.status(400).json({ message: "This order is already cancelled." });
    }

    if (order.orderStatus !== "Processing") {
      return res.status(400).json({
        message:
          "This order has already shipped. Please contact support to request a cancellation.",
      });
    }

    const now = new Date();
    const cancelReason = String(req.body?.reason || "").trim().slice(0, 500);

    const update = {
      $set: {
        orderStatus: "Cancelled",
        cancelledAt: now,
        cancelReason,
        isDelivered: false,
        deliveredAt: null,
      },
      $push: {
        statusHistory: {
          status: "Cancelled",
          changedAt: now,
          note: cancelReason || "Cancelled by customer",
        },
      },
    };

    if (order.paymentStatus === "paid") {
      update.$set.paymentStatus = "refunded";
      update.$set.isPaid = false;
      update.$set.refundedAt = now;
      update.$push.paymentHistory = {
        status: "refunded",
        changedAt: now,
        note: "Order cancelled after payment",
      };
    }

    const updatedOrder = await Order.findOneAndUpdate(
      { _id: id, orderStatus: "Processing" },
      update,
      { new: true },
    );

    if (!updatedOrder) {
      const current = await Order.findById(id);
      if (!current) {
        return res.status(404).json({ message: "Order not found." });
      }
      if (current.orderStatus === "Cancelled") {
        return res.status(400).json({ message: "This order is already cancelled." });
      }
      return res.status(400).json({
        message:
          "This order has already shipped. Please contact support to request a cancellation.",
      });
    }

    await restoreStock(order);

    // Add the returned units to the inventory history.
    await recordOrderStockMovements({
      order: updatedOrder,
      items: updatedOrder.orderItems,
      type: "order_return",
    });

    // The customer-facing cancel route is used by shoppers, including accounts
    // that also have the admin role. Admins cancelling from the admin panel use
    // updateOrderStatus instead, so every cancellation here should notify.
    await createAdminNotification({
      type: "order_cancelled",
      order: updatedOrder,
      reason: cancelReason,
    });

    return res.status(200).json({ order: updatedOrder });
  } catch (error) {
    console.error("Cancel order error:", error);
    return res.status(500).json({ message: "Could not cancel this order." });
  }
};

/**
 * GET /api/admin/orders
 * Search, filter and paginate every order.
 */
export const getAllOrders = async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(req.query.limit, 10, 100);
    const { status, paymentStatus, search, sort } = req.query;

    const filter = {};

    if (status && ORDER_STATUSES.includes(status)) {
      filter.orderStatus = status;
    }

    if (paymentStatus && PAYMENT_STATUSES.includes(paymentStatus)) {
      filter.paymentStatus = paymentStatus;
    }

    if (search && String(search).trim()) {
      const regex = new RegExp(escapeRegex(String(search).trim()), "i");
      filter.$or = [
        { orderNumber: regex },
        { contactEmail: regex },
        { "shippingAddress.fullName": regex },
        { "shippingAddress.phone": regex },
      ];
    }

    const sortOptions = {
      oldest: { createdAt: 1 },
      totalDesc: { totalPrice: -1 },
      totalAsc: { totalPrice: 1 },
      newest: { createdAt: -1 },
    };
    const sortBy = sortOptions[sort] || sortOptions.newest;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort(sortBy)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("user", "name email"),
      Order.countDocuments(filter),
    ]);

    return res.status(200).json({
      orders,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      total,
      limit,
    });
  } catch (error) {
    console.error("Get all orders error:", error);
    return res.status(500).json({ message: "Could not load orders." });
  }
};

/**
 * GET /api/admin/orders/stats
 * Dashboard counters and paid revenue.
 */
export const getOrderStats = async (_req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [totalOrders, statusAgg, paymentAgg, revenueAgg, todayOrders, recentOrders, pendingPayments] =
      await Promise.all([
        Order.countDocuments(),
        Order.aggregate([{ $group: { _id: "$orderStatus", count: { $sum: 1 } } }]),
        Order.aggregate([
          { $group: { _id: "$paymentStatus", count: { $sum: 1 } } },
        ]),
        Order.aggregate([
          { $match: { paymentStatus: "paid" } },
          { $group: { _id: null, total: { $sum: "$totalPrice" } } },
        ]),
        Order.countDocuments({ createdAt: { $gte: startOfToday } }),
        Order.find({})
          .sort({ createdAt: -1 })
          .limit(5)
          .populate("user", "name email"),
        Order.countDocuments({
          paymentStatus: "pending",
          orderStatus: { $ne: "Cancelled" },
        }),
      ]);

    const statusCounts = Object.fromEntries(
      ORDER_STATUSES.map((status) => [status, 0]),
    );
    statusAgg.forEach(({ _id, count }) => {
      if (_id in statusCounts) statusCounts[_id] = count;
    });

    const paymentCounts = Object.fromEntries(
      PAYMENT_STATUSES.map((status) => [status, 0]),
    );
    paymentAgg.forEach(({ _id, count }) => {
      if (_id in paymentCounts) paymentCounts[_id] = count;
    });

    return res.status(200).json({
      stats: {
        totalOrders,
        totalRevenue: roundMoney(revenueAgg[0]?.total || 0),
        pendingPayments,
        todayOrders,
        statusCounts,
        paymentCounts,
      },
      recentOrders,
    });
  } catch (error) {
    console.error("Get order stats error:", error);
    return res.status(500).json({ message: "Could not load order statistics." });
  }
};

/**
 * PATCH /api/admin/orders/:id/status
 * Update fulfilment status. Cancelling restores stock and refunds paid orders;
 * delivering a COD order marks it as paid.
 */
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body ?? {};

    if (!ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid order status." });
    }

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: "Order not found." });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    if (order.orderStatus === status) {
      return res.status(200).json({ order });
    }

    if (order.orderStatus === "Cancelled") {
      return res.status(400).json({
        message: "Cancelled orders cannot be reopened.",
      });
    }

    if (status === "Cancelled" && order.orderStatus !== "Processing") {
      return res.status(400).json({
        message:
          "Orders can only be cancelled while they are processing. This order has already shipped.",
      });
    }

    const now = new Date();
    const previousStatus = order.orderStatus;

    if (status === "Cancelled") {
      const cancelReason = String(note || "").trim().slice(0, 500);

      const update = {
        $set: {
          orderStatus: "Cancelled",
          cancelledAt: now,
          cancelReason,
          isDelivered: false,
          deliveredAt: null,
        },
        $push: {
          statusHistory: {
            status: "Cancelled",
            changedAt: now,
            note: cancelReason || `Changed from ${previousStatus}`,
          },
        },
      };

      if (order.paymentStatus === "paid") {
        update.$set.paymentStatus = "refunded";
        update.$set.isPaid = false;
        update.$set.refundedAt = now;
        update.$push.paymentHistory = {
          status: "refunded",
          changedAt: now,
          note: "Order cancelled",
        };
      }

      const updatedOrder = await Order.findOneAndUpdate(
        { _id: id, orderStatus: "Processing" },
        update,
        { new: true },
      );

      if (!updatedOrder) {
        const current = await Order.findById(id);
        if (!current) {
          return res.status(404).json({ message: "Order not found." });
        }
        if (current.orderStatus === "Cancelled") {
          return res.status(400).json({
            message: "This order is already cancelled.",
          });
        }
        return res.status(400).json({
          message:
            "Orders can only be cancelled while they are processing. This order has already shipped.",
        });
      }

      await restoreStock(order);

      await recordOrderStockMovements({
        order: updatedOrder,
        items: updatedOrder.orderItems,
        type: "order_return",
      });

      const populatedOrder = await Order.findById(updatedOrder._id).populate(
        "user",
        "name email",
      );

      return res.status(200).json({ order: populatedOrder ?? updatedOrder });
    }

    if (status === "Delivered") {
      order.isDelivered = true;
      order.deliveredAt = now;

      // COD is collected on delivery, so receiving the order settles payment.
      if (order.paymentMethod === "COD" && order.paymentStatus !== "paid") {
        order.paymentStatus = "paid";
        order.isPaid = true;
        order.paidAt = now;
        order.paymentHistory.push({
          status: "paid",
          changedAt: now,
          note: "Cash collected on delivery",
        });
      }
    }

    if (status === "Processing" || status === "Shipped") {
      order.isDelivered = false;
      order.deliveredAt = null;
    }

    order.orderStatus = status;
    order.statusHistory.push({
      status,
      changedAt: now,
      note: String(note || "").trim().slice(0, 500) || `Changed from ${previousStatus}`,
    });

    await order.save();

    const populatedOrder = await Order.findById(order._id).populate(
      "user",
      "name email",
    );

    return res.status(200).json({ order: populatedOrder ?? order });
  } catch (error) {
    console.error("Update order status error:", error);
    return res.status(500).json({ message: "Could not update this order." });
  }
};

/**
 * PATCH /api/admin/orders/:id/payment
 * Manually correct the payment state (e.g. cash collected, refund issued).
 */
export const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus, note } = req.body ?? {};

    if (!PAYMENT_STATUSES.includes(paymentStatus)) {
      return res.status(400).json({ message: "Invalid payment status." });
    }

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: "Order not found." });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    if (order.paymentStatus === paymentStatus) {
      return res.status(200).json({ order });
    }

    if (order.orderStatus === "Cancelled" && paymentStatus === "paid") {
      return res.status(400).json({
        message: "A cancelled order cannot be marked as paid.",
      });
    }

    const now = new Date();
    order.paymentStatus = paymentStatus;
    order.isPaid = paymentStatus === "paid";

    if (paymentStatus === "paid") {
      order.paidAt = order.paidAt || now;
    }

    if (paymentStatus === "refunded") {
      order.refundedAt = now;
    }

    order.paymentHistory.push({
      status: paymentStatus,
      changedAt: now,
      note: String(note || "").trim().slice(0, 500) || "Updated by admin",
    });

    await order.save();

    const populatedOrder = await Order.findById(order._id).populate(
      "user",
      "name email",
    );

    return res.status(200).json({ order: populatedOrder ?? order });
  } catch (error) {
    console.error("Update payment status error:", error);
    return res.status(500).json({ message: "Could not update payment status." });
  }
};
