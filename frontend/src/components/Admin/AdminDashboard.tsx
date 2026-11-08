import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
    AlertCircle,
    ArrowRight,
    ArrowUpRight,
    Boxes,
    CheckCircle2,
    Clock,
    DollarSign,
    Package,
    Plus,
    RefreshCw,
    ShoppingBag,
    TrendingDown,
    TrendingUp,
    Truck,
    Users,
    XCircle,
} from "lucide-react";
import Button from "../Common/Button.tsx";
import { dashboardService } from "../../services/dashboardService";
import type { DashboardResponse } from "../../types/dashboard";
import type { Order, OrderStatus } from "../../types/order";
import { formatMoney, formatOrderDate, ORDER_STATUS_LABELS } from "../../utils/order";
import { getApiErrorMessage } from "../../utils/apiError";

type Trend = "up" | "down" | "neutral";

const getCustomer = (order: Order) => {
    const user =
        order.user && typeof order.user === "object" ? order.user : undefined;

    return {
        name: user?.name || order.shippingAddress.fullName || "Guest",
        email: order.contactEmail || user?.email || "—",
    };
};

const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
        case "Delivered":
            return (
                <span className="status-badge status-badge-success">
                    <CheckCircle2 className="w-3.5 h-3.5" />{" "}
                    {ORDER_STATUS_LABELS.Delivered}
                </span>
            );
        case "Shipped":
            return (
                <span className="status-badge status-badge-info">
                    <Truck className="w-3.5 h-3.5" />{" "}
                    {ORDER_STATUS_LABELS.Shipped}
                </span>
            );
        case "Processing":
            return (
                <span className="status-badge status-badge-warning">
                    <Clock className="w-3.5 h-3.5" />{" "}
                    {ORDER_STATUS_LABELS.Processing}
                </span>
            );
        case "Cancelled":
            return (
                <span className="status-badge status-badge-danger">
                    <XCircle className="w-3.5 h-3.5" />{" "}
                    {ORDER_STATUS_LABELS.Cancelled}
                </span>
            );
        default:
            return null;
    }
};

const formatPercentChange = (value: number) =>
    `${value > 0 ? "+" : ""}${value.toLocaleString("en-US", {
        maximumFractionDigits: 1,
    })}%`;

const AdminDashboard = () => {
    const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);
    const latestRequestIdRef = useRef(0);

    const loadDashboard = useCallback(async (refresh = false) => {
        const requestId = ++latestRequestIdRef.current;

        if (refresh) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }
        setError(null);

        try {
            const data = await dashboardService.getDashboard();
            if (requestId !== latestRequestIdRef.current) return;

            setDashboard(data);
            setLastUpdated(new Date());
        } catch (loadError) {
            if (requestId !== latestRequestIdRef.current) return;

            setError(
                getApiErrorMessage(
                    loadError,
                    "Could not load dashboard data right now."
                )
            );
        } finally {
            if (requestId === latestRequestIdRef.current) {
                setIsLoading(false);
                setIsRefreshing(false);
            }
        }
    }, []);

    useEffect(() => {
        void loadDashboard();
    }, [loadDashboard]);

    const stats: Array<{
        title: string;
        value: string;
        change: string;
        trend: Trend;
        period: string;
        icon: typeof DollarSign;
        color: string;
    }> = [
        {
            title: "Total Revenue",
            value: dashboard ? formatMoney(dashboard.stats.totalRevenue) : "—",
            change: dashboard
                ? formatPercentChange(dashboard.stats.revenueChangePercent)
                : "—",
            trend: dashboard
                ? dashboard.stats.revenueChangePercent > 0
                    ? "up"
                    : dashboard.stats.revenueChangePercent < 0
                      ? "down"
                      : "neutral"
                : "neutral",
            period: "vs last month",
            icon: DollarSign,
            color: "text-emerald-600 bg-emerald-50",
        },
        {
            title: "Total Orders",
            value: dashboard
                ? dashboard.stats.totalOrders.toLocaleString("en-US")
                : "—",
            change: dashboard
                ? formatPercentChange(dashboard.stats.ordersChangePercent)
                : "—",
            trend: dashboard
                ? dashboard.stats.ordersChangePercent > 0
                    ? "up"
                    : dashboard.stats.ordersChangePercent < 0
                      ? "down"
                      : "neutral"
                : "neutral",
            period: "vs last month",
            icon: Package,
            color: "text-blue-600 bg-blue-50",
        },
        {
            title: "Total Products",
            value: dashboard
                ? dashboard.stats.totalProducts.toLocaleString("en-US")
                : "—",
            change: dashboard
                ? `${dashboard.stats.lowStockProducts} low stock`
                : "—",
            trend: "neutral",
            period: dashboard
                ? `Across ${dashboard.stats.totalCollections} collections`
                : "Loading collections",
            icon: ShoppingBag,
            color: "text-purple-600 bg-purple-50",
        },
        {
            title: "Active Customers",
            value: dashboard
                ? dashboard.stats.activeCustomers.toLocaleString("en-US")
                : "—",
            change: dashboard
                ? `+${dashboard.stats.newCustomersThisWeek.toLocaleString("en-US")}`
                : "—",
            trend:
                dashboard && dashboard.stats.newCustomersThisWeek > 0
                    ? "up"
                    : "neutral",
            period: dashboard
                ? `${dashboard.stats.totalCustomers.toLocaleString(
                      "en-US"
                  )} registered customers`
                : "Loading customers",
            icon: Users,
            color: "text-amber-600 bg-amber-50",
        },
    ];

    const recentOrders = dashboard?.recentOrders ?? [];
    const topProducts = dashboard?.topProducts ?? [];

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            {/* Header with Title and Quick Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title">Dashboard Overview</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Welcome back! Here is a live overview of ClassyShop&apos;s
                        performance.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Button
                        type="button"
                        onClick={() => void loadDashboard(true)}
                        disabled={isRefreshing}
                        className="btn-outline inline-flex items-center gap-2"
                    >
                        <RefreshCw
                            className={`w-4 h-4 ${
                                isRefreshing ? "animate-spin" : ""
                            }`}
                        />
                        <span>Refresh</span>
                    </Button>

                    <Link to="/admin/inventory">
                        <Button className="btn-outline inline-flex items-center gap-2">
                            <Boxes className="w-4 h-4" />
                            <span>Inventory</span>
                        </Button>
                    </Link>

                    <Link to="/admin/products/new">
                        <Button className="btn-primary-action">
                            <Plus className="w-4 h-4" />
                            <span>Add Product</span>
                        </Button>
                    </Link>
                </div>
            </div>

            {error && (
                <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="flex-1">
                        <p>{error}</p>
                        <Button
                            type="button"
                            onClick={() => void loadDashboard()}
                            className="mt-2 text-xs font-semibold underline underline-offset-2"
                        >
                            Try again
                        </Button>
                    </div>
                </div>
            )}

            {/* Metrics Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div key={stat.title} className="admin-stat-card">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-500">
                                    {stat.title}
                                </span>
                                <div
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}
                                >
                                    <Icon className="w-5 h-5" />
                                </div>
                            </div>
                            <div className="mt-4 flex items-baseline justify-between">
                                <span className="text-2xl sm:text-3xl font-extrabold text-gray-950">
                                    {stat.value}
                                </span>
                                <span
                                    className={`inline-flex items-center text-xs font-semibold ${
                                        stat.trend === "up"
                                            ? "text-emerald-600"
                                            : stat.trend === "down"
                                              ? "text-red-600"
                                              : "text-gray-500"
                                    }`}
                                >
                                    {stat.trend === "up" && (
                                        <TrendingUp className="w-3.5 h-3.5 mr-1" />
                                    )}
                                    {stat.trend === "down" && (
                                        <TrendingDown className="w-3.5 h-3.5 mr-1" />
                                    )}
                                    {stat.change}
                                </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1.5">
                                {stat.period}
                            </p>
                        </div>
                    );
                })}
            </div>

            {/* Recent Orders & Top Selling Products Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Orders Table (2 Cols) */}
                <div className="lg:col-span-2 card-container">
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h2 className="card-title">Recent Orders</h2>
                            <p className="text-xs text-gray-500">
                                Latest transactions across the store
                            </p>
                        </div>
                        <Link
                            to="/admin/orders"
                            className="text-xs font-semibold text-black hover:text-red-600 flex items-center gap-1 transition"
                        >
                            <span>View all orders</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="table-head-row">
                                <tr>
                                    <th className="py-3.5 px-5">Order ID</th>
                                    <th className="py-3.5 px-5">Customer</th>
                                    <th className="py-3.5 px-5">Total</th>
                                    <th className="py-3.5 px-5">Status</th>
                                    <th className="py-3.5 px-5 text-right">
                                        Action
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {isLoading && !dashboard ? (
                                    Array.from({ length: 5 }, (_, index) => (
                                        <tr key={index} className="animate-pulse">
                                            <td className="py-4 px-5">
                                                <div className="h-3 w-24 rounded-full bg-gray-100" />
                                            </td>
                                            <td className="py-4 px-5">
                                                <div className="h-3 w-32 rounded-full bg-gray-100" />
                                            </td>
                                            <td className="py-4 px-5">
                                                <div className="h-3 w-16 rounded-full bg-gray-100" />
                                            </td>
                                            <td className="py-4 px-5">
                                                <div className="h-6 w-20 rounded-full bg-gray-100" />
                                            </td>
                                            <td className="py-4 px-5">
                                                <div className="ml-auto h-3 w-16 rounded-full bg-gray-100" />
                                            </td>
                                        </tr>
                                    ))
                                ) : recentOrders.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="py-12 text-center text-gray-500"
                                        >
                                            <Package className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                                            <p className="text-sm font-medium">
                                                No orders yet
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                New customer orders will appear
                                                here.
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    recentOrders.map((order) => {
                                        const customer = getCustomer(order);

                                        return (
                                            <tr
                                                key={order._id}
                                                className="table-row-hover"
                                            >
                                                <td className="py-4 px-5 font-semibold text-gray-900">
                                                    #
                                                    {order.orderNumber ||
                                                        order._id}
                                                </td>
                                                <td className="py-4 px-5">
                                                    <p className="font-medium text-gray-900 line-clamp-1">
                                                        {customer.name}
                                                    </p>
                                                    <p className="text-xs text-gray-400 line-clamp-1">
                                                        {customer.email}
                                                    </p>
                                                </td>
                                                <td className="py-4 px-5 font-bold text-gray-900">
                                                    {formatMoney(
                                                        order.totalPrice
                                                    )}
                                                </td>
                                                <td className="py-4 px-5 whitespace-nowrap">
                                                    {getStatusBadge(
                                                        order.orderStatus
                                                    )}
                                                </td>
                                                <td className="py-4 px-5 text-right whitespace-nowrap">
                                                    <Link
                                                        to={`/admin/orders/${order._id}`}
                                                        className="admin-action-link"
                                                    >
                                                        <span>Details</span>
                                                        <ArrowUpRight className="w-3 h-3" />
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Best Selling Products Card (1 Col) */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                        <div>
                            <h2 className="card-title">Top Products</h2>
                            <p className="text-xs text-gray-500">
                                Highest grossing items
                            </p>
                        </div>
                        <Link
                            to="/admin/products"
                            className="text-xs font-semibold text-black hover:text-red-600 transition"
                        >
                            Manage
                        </Link>
                    </div>

                    <div className="space-y-4">
                        {isLoading && !dashboard ? (
                            Array.from({ length: 4 }, (_, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-3.5 animate-pulse"
                                >
                                    <div className="w-12 h-14 rounded-xl bg-gray-100 shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 w-3/4 rounded-full bg-gray-100" />
                                        <div className="h-3 w-1/2 rounded-full bg-gray-100" />
                                    </div>
                                </div>
                            ))
                        ) : topProducts.length === 0 ? (
                            <div className="py-8 text-center text-gray-500">
                                <ShoppingBag className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                                <p className="text-sm font-medium">
                                    No sales yet
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Best sellers appear after the first order.
                                </p>
                            </div>
                        ) : (
                            topProducts.map((product) => (
                                <div
                                    key={product._id}
                                    className="flex items-center gap-3.5"
                                >
                                    {product.image ? (
                                        <img
                                            src={product.image}
                                            alt={product.name}
                                            className="w-12 h-14 object-cover rounded-xl border border-gray-200 shrink-0"
                                        />
                                    ) : (
                                        <div className="w-12 h-14 rounded-xl border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center shrink-0">
                                            <Package className="w-5 h-5 text-gray-300" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-sm text-gray-900 truncate">
                                            {product.name}
                                        </h3>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {product.category} &middot;{" "}
                                            {formatMoney(product.price)}
                                        </p>
                                        <p className="text-xs font-medium text-emerald-600 mt-0.5">
                                            {product.sales} sold (
                                            {formatMoney(product.revenue)})
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="pt-2">
                        <Link to="/admin/products/new" className="block">
                            <Button
                                type="button"
                                className="w-full py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-xs font-semibold text-gray-800 transition"
                            >
                                + Create New Listing
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            <p className="text-xs text-gray-400 text-right">
                {dashboard
                    ? `${dashboard.stats.todayOrders} order(s) today · ${dashboard.stats.pendingPayments} pending payment(s)`
                    : "Loading store activity…"}
                {dashboard && lastUpdated && (
                    <span className="ml-2">
                        Updated {formatOrderDate(lastUpdated)}
                    </span>
                )}
            </p>
        </div>
    );
};

export default AdminDashboard;
