import Order, { ORDER_STATUSES, PAYMENT_STATUSES } from "../models/Order.js";
import Product from "../models/Product.js";
import User from "../models/User.js";

const LOW_STOCK_THRESHOLD = 10;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

const percentChange = (current, previous) => {
  if (!previous) {
    return current > 0 ? 100 : 0;
  }

  return Math.round(((current - previous) / previous) * 1000) / 10;
};

/**
 * GET /api/admin/dashboard
 * Real store metrics, the latest orders and the best-selling products for the
 * admin overview page. Every value is derived from the database, never mocked
 * on the client.
 */
export const getDashboard = async (_req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_IN_MS);

    const [
      totalOrders,
      todayOrders,
      pendingPayments,
      statusAgg,
      paymentAgg,
      revenueAgg,
      thisMonthRevenueAgg,
      lastMonthRevenueAgg,
      thisMonthOrders,
      lastMonthOrders,
      totalProducts,
      lowStockProducts,
      collections,
      totalCustomers,
      newCustomersThisWeek,
      activeCustomerIds,
      recentOrders,
      topProductAgg,
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ createdAt: { $gte: startOfToday } }),
      Order.countDocuments({
        paymentStatus: "pending",
        orderStatus: { $ne: "Cancelled" },
      }),
      Order.aggregate([{ $group: { _id: "$orderStatus", count: { $sum: 1 } } }]),
      Order.aggregate([
        { $group: { _id: "$paymentStatus", count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { paymentStatus: "paid" } },
        { $group: { _id: null, total: { $sum: "$totalPrice" } } },
      ]),
      Order.aggregate([
        {
          $match: {
            paymentStatus: "paid",
            createdAt: { $gte: startOfThisMonth, $lt: startOfNextMonth },
          },
        },
        { $group: { _id: null, total: { $sum: "$totalPrice" } } },
      ]),
      Order.aggregate([
        {
          $match: {
            paymentStatus: "paid",
            createdAt: { $gte: startOfLastMonth, $lt: startOfThisMonth },
          },
        },
        { $group: { _id: null, total: { $sum: "$totalPrice" } } },
      ]),
      Order.countDocuments({
        createdAt: { $gte: startOfThisMonth, $lt: startOfNextMonth },
      }),
      Order.countDocuments({
        createdAt: { $gte: startOfLastMonth, $lt: startOfThisMonth },
      }),
      Product.countDocuments(),
      Product.countDocuments({ countInStock: { $lte: LOW_STOCK_THRESHOLD } }),
      Product.distinct("collections"),
      User.countDocuments({ role: "customer" }),
      User.countDocuments({
        role: "customer",
        createdAt: { $gte: sevenDaysAgo },
      }),
      Order.distinct("user", { orderStatus: { $ne: "Cancelled" } }),
      Order.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("user", "name email"),
      Order.aggregate([
        { $match: { orderStatus: { $ne: "Cancelled" } } },
        { $unwind: "$orderItems" },
        {
          $group: {
            _id: "$orderItems.productId",
            name: { $last: "$orderItems.name" },
            image: { $last: "$orderItems.image" },
            sales: { $sum: { $ifNull: ["$orderItems.quantity", 0] } },
            revenue: {
              $sum: {
                $multiply: [
                  { $ifNull: ["$orderItems.quantity", 0] },
                  { $ifNull: ["$orderItems.price", 0] },
                ],
              },
            },
          },
        },
        { $sort: { sales: -1, revenue: -1 } },
        { $limit: 4 },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "product",
          },
        },
        {
          $unwind: {
            path: "$product",
            preserveNullAndEmptyArrays: true,
          },
        },
      ]),
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

    const totalRevenue = roundMoney(revenueAgg[0]?.total || 0);
    const thisMonthRevenue = roundMoney(
      thisMonthRevenueAgg[0]?.total || 0,
    );
    const lastMonthRevenue = roundMoney(
      lastMonthRevenueAgg[0]?.total || 0,
    );

    const totalCollections = collections.filter(
      (collection) => String(collection || "").trim(),
    ).length;

    const topProducts = topProductAgg.map((item) => {
      const product = item.product;
      const price = Number(product?.discountPrice) || Number(product?.price);

      return {
        _id: String(item._id),
        name: item.name || product?.name || "Product",
        image: item.image || product?.images?.[0]?.url || "",
        category: product?.category || "Uncategorised",
        price: Number.isFinite(price) ? price : roundMoney(item.revenue / (item.sales || 1)),
        sales: item.sales || 0,
        revenue: roundMoney(item.revenue),
      };
    });

    return res.status(200).json({
      stats: {
        totalRevenue,
        totalOrders,
        totalProducts,
        activeCustomers: activeCustomerIds.length,
        totalCustomers,
        lowStockProducts,
        totalCollections,
        todayOrders,
        pendingPayments,
        newCustomersThisWeek,
        revenueChangePercent: percentChange(
          thisMonthRevenue,
          lastMonthRevenue,
        ),
        ordersChangePercent: percentChange(
          thisMonthOrders,
          lastMonthOrders,
        ),
        statusCounts,
        paymentCounts,
      },
      recentOrders,
      topProducts,
    });
  } catch (error) {
    console.error("Get dashboard error:", error);
    return res
      .status(500)
      .json({ message: "Could not load dashboard data." });
  }
};

export default getDashboard;
