import { useState } from "react";
import { Link } from "react-router-dom";
import {
    Search,
    ExternalLink,
    Filter
} from "lucide-react";
import { toast } from "sonner";

const OrderManagement = () => {
    const [orders, setOrders] = useState<AdminOrder[]>([
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
        {
            _id: "ORD-432109",
            customer: { name: "Robert Taylor", email: "robert.t@example.com" },
            totalPrice: 195.0,
            isPaid: true,
            status: "Shipped",
            createdAt: "2026-10-14T16:22:00Z",
            itemsCount: 2,
        },
    ]);

    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [paymentFilter, setPaymentFilter] = useState("all");

    // Filter logic
    const filteredOrders = orders.filter((order) => {
        const matchesSearch =
            order._id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.customer.email.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
            statusFilter === "all" || order.status.toLowerCase() === statusFilter.toLowerCase();

        const matchesPayment =
            paymentFilter === "all" ||
            (paymentFilter === "paid" && order.isPaid) ||
            (paymentFilter === "unpaid" && !order.isPaid);

        return matchesSearch && matchesStatus && matchesPayment;
    });

    const handleStatusChange = (orderId: string, newStatus: AdminOrder["status"]) => {
        setOrders((prev) =>
            prev.map((order) =>
                order._id === orderId ? { ...order, status: newStatus } : order
            )
        );
        toast.success(`Order #${orderId} status updated to "${newStatus}"`);
    };

    const handleTogglePayment = (orderId: string, currentPaid: boolean) => {
        setOrders((prev) =>
            prev.map((order) =>
                order._id === orderId ? { ...order, isPaid: !currentPaid } : order
            )
        );
        toast.info(
            `Order #${orderId} marked as ${!currentPaid ? "PAID" : "PENDING PAYMENT"}`
        );
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                            Orders Management
                        </h1>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-200 text-gray-800">
                            {orders.length} total
                        </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                        Track customer orders, update fulfillment statuses, and manage payments.
                    </p>
                </div>
            </div>

            {/* Quick Summary Pill Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
                    <span className="text-xs text-gray-500 font-medium">Processing</span>
                    <p className="text-xl font-bold text-amber-600 mt-1">
                        {orders.filter((o) => o.status === "Processing").length}
                    </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
                    <span className="text-xs text-gray-500 font-medium">Shipped</span>
                    <p className="text-xl font-bold text-blue-600 mt-1">
                        {orders.filter((o) => o.status === "Shipped").length}
                    </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
                    <span className="text-xs text-gray-500 font-medium">Delivered</span>
                    <p className="text-xl font-bold text-emerald-600 mt-1">
                        {orders.filter((o) => o.status === "Delivered").length}
                    </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
                    <span className="text-xs text-gray-500 font-medium">Cancelled</span>
                    <p className="text-xl font-bold text-red-600 mt-1">
                        {orders.filter((o) => o.status === "Cancelled").length}
                    </p>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-96">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by order ID, name, email..."
                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    />
                </div>

                <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Filter className="w-4 h-4 text-gray-400 shrink-0" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-black"
                        >
                            <option value="all">All Delivery Statuses</option>
                            <option value="Processing">Processing</option>
                            <option value="Shipped">Shipped</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                    </div>

                    <select
                        value={paymentFilter}
                        onChange={(e) => setPaymentFilter(e.target.value)}
                        className="w-full sm:w-auto px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-black"
                    >
                        <option value="all">All Payments</option>
                        <option value="paid">Paid</option>
                        <option value="unpaid">Unpaid / Pending</option>
                    </select>
                </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50/70 text-xs uppercase text-gray-500 font-semibold border-b border-gray-100">
                            <tr>
                                <th className="py-3.5 px-5">Order ID</th>
                                <th className="py-3.5 px-5">Customer</th>
                                <th className="py-3.5 px-5">Items</th>
                                <th className="py-3.5 px-5">Total</th>
                                <th className="py-3.5 px-5">Payment</th>
                                <th className="py-3.5 px-5">Fulfillment Status</th>
                                <th className="py-3.5 px-5">Date</th>
                                <th className="py-3.5 px-5 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredOrders.length > 0 ? (
                                filteredOrders.map((order) => (
                                    <tr key={order._id} className="hover:bg-gray-50/80 transition-colors">
                                        <td className="py-4 px-5 font-semibold text-gray-900 whitespace-nowrap">
                                            #{order._id}
                                        </td>
                                        <td className="py-4 px-5">
                                            <p className="font-semibold text-gray-900">{order.customer.name}</p>
                                            <p className="text-xs text-gray-400">{order.customer.email}</p>
                                        </td>
                                        <td className="py-4 px-5 text-xs text-gray-700 font-medium">
                                            {order.itemsCount} {order.itemsCount > 1 ? "items" : "item"}
                                        </td>
                                        <td className="py-4 px-5 font-bold text-gray-900">
                                            ${order.totalPrice.toFixed(2)}
                                        </td>
                                        <td className="py-4 px-5 whitespace-nowrap">
                                            <button
                                                onClick={() => handleTogglePayment(order._id, order.isPaid)}
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition ${
                                                    order.isPaid
                                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                                        : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                                                }`}
                                                title="Click to toggle payment status"
                                            >
                                                <span
                                                    className={`w-1.5 h-1.5 rounded-full ${
                                                        order.isPaid ? "bg-emerald-500" : "bg-amber-500"
                                                    }`}
                                                />
                                                <span>{order.isPaid ? "Paid" : "Pending"}</span>
                                            </button>
                                        </td>
                                        <td className="py-4 px-5 whitespace-nowrap">
                                            <select
                                                value={order.status}
                                                onChange={(e) =>
                                                    handleStatusChange(
                                                        order._id,
                                                        e.target.value as AdminOrder["status"]
                                                    )
                                                }
                                                className={`text-xs font-semibold px-2.5 py-1.5 rounded-xl border focus:outline-none cursor-pointer transition ${
                                                    order.status === "Delivered"
                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                        : order.status === "Shipped"
                                                        ? "bg-blue-50 text-blue-700 border-blue-200"
                                                        : order.status === "Processing"
                                                        ? "bg-amber-50 text-amber-700 border-amber-200"
                                                        : "bg-red-50 text-red-700 border-red-200"
                                                }`}
                                            >
                                                <option value="Processing">Processing</option>
                                                <option value="Shipped">Shipped</option>
                                                <option value="Delivered">Delivered</option>
                                                <option value="Cancelled">Cancelled</option>
                                            </select>
                                        </td>
                                        <td className="py-4 px-5 text-xs text-gray-500 whitespace-nowrap">
                                            {new Date(order.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="py-4 px-5 text-right whitespace-nowrap">
                                            <Link
                                                to={`/order/${order._id}`}
                                                className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-black hover:underline"
                                            >
                                                <span>View Order</span>
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center text-gray-500">
                                        No orders found matching the filter criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <span>
                        Showing {filteredOrders.length} of {orders.length} orders
                    </span>
                    <span className="font-medium">ClassyShop Fulfillment Engine</span>
                </div>
            </div>
        </div>
    );
};

export default OrderManagement;
