import { Link } from "react-router-dom";
import {
    DollarSign,
    Package,
    ShoppingBag,
    Users,
    TrendingUp,
    ArrowUpRight,
    ArrowRight,
    CheckCircle2,
    Clock,
    Truck,
    XCircle,
    Plus
} from "lucide-react";
import Button from "../Common/Button.tsx";

const AdminDashboard = () => {
    // Mock Dashboard Stats
    const stats = [
        {
            title: "Total Revenue",
            value: "$38,450.00",
            change: "+14.2%",
            trend: "up",
            period: "vs last month",
            icon: DollarSign,
            color: "text-emerald-600 bg-emerald-50",
        },
        {
            title: "Total Orders",
            value: "1,284",
            change: "+8.5%",
            trend: "up",
            period: "vs last month",
            icon: Package,
            color: "text-blue-600 bg-blue-50",
        },
        {
            title: "Total Products",
            value: "48",
            change: "4 Low stock",
            trend: "neutral",
            period: "Across 4 collections",
            icon: ShoppingBag,
            color: "text-purple-600 bg-purple-50",
        },
        {
            title: "Active Customers",
            value: "942",
            change: "+28",
            trend: "up",
            period: "new this week",
            icon: Users,
            color: "text-amber-600 bg-amber-50",
        },
    ];

    // Mock Recent Orders
    const recentOrders: AdminOrder[] = [
        {
            _id: "ORD-948271",
            customer: { name: "Sarah Jenkins", email: "sarah.j@example.com" },
            totalPrice: 249.0,
            isPaid: true,
            status: "Delivered",
            createdAt: "2026-10-17T11:20:00Z",
            itemsCount: 3,
        },
        {
            _id: "ORD-883921",
            customer: { name: "Michael Chang", email: "m.chang@example.com" },
            totalPrice: 135.5,
            isPaid: true,
            status: "Processing",
            createdAt: "2026-10-17T09:45:00Z",
            itemsCount: 2,
        },
        {
            _id: "ORD-761920",
            customer: { name: "Emma Watson", email: "emma.w@example.com" },
            totalPrice: 60.0,
            isPaid: false,
            status: "Processing",
            createdAt: "2026-10-16T18:15:00Z",
            itemsCount: 1,
        },
        {
            _id: "ORD-654812",
            customer: { name: "David Miller", email: "david.m@example.com" },
            totalPrice: 320.0,
            isPaid: true,
            status: "Shipped",
            createdAt: "2026-10-16T14:30:00Z",
            itemsCount: 4,
        },
        {
            _id: "ORD-541298",
            customer: { name: "Lisa Brown", email: "lisa.b@example.com" },
            totalPrice: 85.0,
            isPaid: false,
            status: "Cancelled",
            createdAt: "2026-10-15T10:05:00Z",
            itemsCount: 1,
        },
    ];

    // Mock Best Selling Products
    const topProducts = [
        {
            id: "1",
            name: "Stylish Jacket",
            category: "Top Wear",
            price: 120,
            sales: 142,
            revenue: "$17,040",
            image: "https://picsum.photos/200?random=1",
        },
        {
            id: "2",
            name: "Classic White T-Shirt",
            category: "Men",
            price: 25,
            sales: 210,
            revenue: "$5,250",
            image: "https://picsum.photos/200?random=2",
        },
        {
            id: "3",
            name: "Slim Fit Denim Jeans",
            category: "Bottom Wear",
            price: 65,
            sales: 98,
            revenue: "$6,370",
            image: "https://picsum.photos/200?random=4",
        },
        {
            id: "4",
            name: "Casual Street Hoodie",
            category: "Women",
            price: 55,
            sales: 84,
            revenue: "$4,620",
            image: "https://picsum.photos/200?random=6",
        },
    ];

    const getStatusBadge = (status: AdminOrder["status"]) => {
        switch (status) {
            case "Delivered":
                return (
                    <span className="status-badge status-badge-success">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Delivered
                    </span>
                );
            case "Shipped":
                return (
                    <span className="status-badge status-badge-info">
                        <Truck className="w-3.5 h-3.5" /> Shipped
                    </span>
                );
            case "Processing":
                return (
                    <span className="status-badge status-badge-warning">
                        <Clock className="w-3.5 h-3.5" /> Processing
                    </span>
                );
            case "Cancelled":
                return (
                    <span className="status-badge status-badge-danger">
                        <XCircle className="w-3.5 h-3.5" /> Cancelled
                    </span>
                );
        }
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            {/* Header with Title and Quick Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title">
                        Dashboard Overview
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Welcome back! Here is an overview of ClassyShop's performance today.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Link to="/admin/products/new">
                        <Button className="btn-primary-action">
                            <Plus className="w-4 h-4" />
                            <span>Add Product</span>
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Metrics Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {stats.map((stat, idx) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={idx}
                            className="admin-stat-card"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-500">
                                    {stat.title}
                                </span>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                            </div>
                            <div className="mt-4 flex items-baseline justify-between">
                                <span className="text-2xl sm:text-3xl font-extrabold text-gray-950">
                                    {stat.value}
                                </span>
                                <span
                                    className={`inline-flex items-center text-xs font-semibold ${
                                        stat.trend === "up" ? "text-emerald-600" : "text-gray-500"
                                    }`}
                                >
                                    {stat.trend === "up" && <TrendingUp className="w-3.5 h-3.5 mr-1" />}
                                    {stat.change}
                                </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1.5">{stat.period}</p>
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
                            <p className="text-xs text-gray-500">Latest transactions across the store</p>
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
                                    <th className="py-3.5 px-5 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {recentOrders.map((order) => (
                                    <tr key={order._id} className="table-row-hover">
                                        <td className="py-4 px-5 font-semibold text-gray-900">
                                            #{order._id}
                                        </td>
                                        <td className="py-4 px-5">
                                            <p className="font-medium text-gray-900 line-clamp-1">
                                                {order.customer.name}
                                            </p>
                                            <p className="text-xs text-gray-400 line-clamp-1">
                                                {order.customer.email}
                                            </p>
                                        </td>
                                        <td className="py-4 px-5 font-bold text-gray-900">
                                            ${order.totalPrice.toFixed(2)}
                                        </td>
                                        <td className="py-4 px-5 whitespace-nowrap">
                                            {getStatusBadge(order.status)}
                                        </td>
                                        <td className="py-4 px-5 text-right whitespace-nowrap">
                                            <Link
                                                to={`/order/${order._id}`}
                                                className="admin-action-link"
                                            >
                                                <span>Details</span>
                                                <ArrowUpRight className="w-3 h-3" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Best Selling Products Card (1 Col) */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                        <div>
                            <h2 className="card-title">Top Products</h2>
                            <p className="text-xs text-gray-500">Highest grossing items</p>
                        </div>
                        <Link
                            to="/admin/products"
                            className="text-xs font-semibold text-black hover:text-red-600 transition"
                        >
                            Manage
                        </Link>
                    </div>

                    <div className="space-y-4">
                        {topProducts.map((prod) => (
                            <div key={prod.id} className="flex items-center gap-3.5">
                                <img
                                    src={prod.image}
                                    alt={prod.name}
                                    className="w-12 h-14 object-cover rounded-xl border border-gray-200 shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-sm text-gray-900 truncate">
                                        {prod.name}
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {prod.category} &middot; ${prod.price}
                                    </p>
                                    <p className="text-xs font-medium text-emerald-600 mt-0.5">
                                        {prod.sales} sold ({prod.revenue})
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-2">
                        <Link to="/admin/products/new" className="block">
                            <button className="w-full py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-xs font-semibold text-gray-800 transition cursor-pointer">
                                + Create New Listing
                            </button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
