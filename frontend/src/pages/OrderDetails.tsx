import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
    ArrowLeft,
    CheckCircle2,
    Truck,
    Package,
    CreditCard,
    MapPin,
    Calendar,
    ShoppingBag,
    HelpCircle,
    Printer,
    ExternalLink
} from "lucide-react";
import Button from "../components/Common/Button.tsx";

const OrderDetails = () => {
    const { id } = useParams();
    const [orderDetails, setOrderDetails] = useState<OrderDetails>();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Simulate network delay for realistic feel
        const timer = setTimeout(() => {
            const mockOrderDetails: OrderDetails = {
                _id: id || "ORD-749201",
                createdAt: new Date(),
                isPaid: true,
                isDelivered: false,
                paymentMethod: "PayPal",
                shippingMethod: "Standard",
                shippingAddress: {
                    address: "123 Broadway Avenue, Apt 4B",
                    city: "New York",
                    postalCode: "10001",
                    country: "USA"
                },
                orderItems: [
                    {
                        productId: "1",
                        name: "Jacket",
                        price: 120,
                        quantity: 1,
                        image: "https://picsum.photos/200?random=1",
                    },
                    {
                        productId: "2",
                        name: "Jacket 2",
                        price: 129,
                        quantity: 1,
                        image: "https://picsum.photos/200?random=2",
                    },
                    {
                        productId: "4",
                        name: "T-Shirt",
                        price: 60,
                        quantity: 2,
                        image: "https://picsum.photos/200?random=4",
                    },
                ]
            };

            setOrderDetails(mockOrderDetails);
            setIsLoading(false);
        }, 300);

        return () => clearTimeout(timer);
    }, [id]);

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[60vh]">
                <div className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Loading order details...</p>
            </div>
        );
    }

    if (!orderDetails) {
        return (
            <div className="container mx-auto px-4 py-16 text-center max-w-md">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                    <Package className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h2>
                <p className="text-gray-500 mb-6">
                    We couldn't locate any order with the provided identification.
                </p>
                <Link to="/profile">
                    <Button className="btn-black px-6 py-2.5 rounded-lg text-sm font-medium">
                        Back to My Orders
                    </Button>
                </Link>
            </div>
        );
    }

    const subtotal = orderDetails.orderItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );
    const shippingFee = orderDetails.shippingMethod === "Express" ? 15 : 0;
    const tax = Math.round(subtotal * 0.08 * 100) / 100;
    const totalAmount = orderDetails.totalPrice ?? (subtotal + shippingFee + tax);

    const formattedDate = new Date(orderDetails.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });

    const formattedTime = new Date(orderDetails.createdAt).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
    });

    const steps = [
        { title: "Order Placed", done: true, icon: CheckCircle2 },
        { title: "Payment Confirmed", done: orderDetails.isPaid, icon: CreditCard },
        { title: "Processing", done: orderDetails.isPaid, icon: Package },
        { title: "Delivered", done: orderDetails.isDelivered, icon: Truck },
    ];

    return (
        <div className="bg-gray-50/50 min-h-screen py-8 sm:py-12">
            <div className="container mx-auto px-4 max-w-6xl">
                {/* Back navigation & actions */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <Link
                        to="/profile"
                        className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-black transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1.5" />
                        Back to My Orders
                    </Link>

                    <button
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-gray-600 hover:text-black border border-gray-300 rounded-lg px-3 py-1.5 bg-white transition hover:bg-gray-50 cursor-pointer print:hidden"
                    >
                        <Printer className="w-4 h-4" />
                        Print Invoice
                    </button>
                </div>

                {/* Header Card */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-xs mb-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-100">
                        <div>
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                                    Order #{orderDetails._id}
                                </h1>
                                {/* Status badges */}
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                                            orderDetails.isPaid
                                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                : "bg-amber-50 text-amber-700 border border-amber-200"
                                        }`}
                                    >
                                        <span
                                            className={`w-1.5 h-1.5 rounded-full ${
                                                orderDetails.isPaid ? "bg-emerald-500" : "bg-amber-500"
                                            }`}
                                        />
                                        {orderDetails.isPaid ? "Paid" : "Pending Payment"}
                                    </span>

                                    <span
                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                                            orderDetails.isDelivered
                                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                : "bg-blue-50 text-blue-700 border border-blue-200"
                                        }`}
                                    >
                                        <Truck className="w-3.5 h-3.5" />
                                        {orderDetails.isDelivered ? "Delivered" : "In Transit"}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span>Placed on {formattedDate} at {formattedTime}</span>
                            </div>
                        </div>

                        <div className="flex md:flex-col items-start md:items-end justify-between border-t md:border-t-0 pt-3 md:pt-0 border-gray-100">
                            <span className="text-xs uppercase tracking-wider text-gray-500 font-medium">
                                Total Amount
                            </span>
                            <span className="text-2xl sm:text-3xl font-extrabold text-gray-950">
                                ${totalAmount.toFixed(2)}
                            </span>
                        </div>
                    </div>

                    {/* Order Progress Stepper */}
                    <div className="pt-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative">
                            {steps.map((step, idx) => {
                                const Icon = step.icon;
                                const isCurrent = step.done && !steps[idx + 1]?.done;

                                return (
                                    <div key={step.title} className="flex flex-col items-center text-center">
                                        <div
                                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                                step.done
                                                    ? "bg-emerald-600 text-white shadow-sm"
                                                    : "bg-gray-100 text-gray-400 border border-gray-200"
                                            } ${isCurrent ? "ring-4 ring-emerald-100" : ""}`}
                                        >
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <span
                                            className={`text-xs sm:text-sm font-semibold mt-2.5 ${
                                                step.done ? "text-gray-900" : "text-gray-400"
                                            }`}
                                        >
                                            {step.title}
                                        </span>
                                        <span className="text-[11px] text-gray-400 mt-0.5">
                                            {step.done ? "Completed" : "Pending"}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Main Content Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Order Items & Delivery/Payment cards */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Items Table Card */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <ShoppingBag className="w-5 h-5 text-gray-700" />
                                    <h2 className="text-lg font-bold text-gray-900">
                                        Order Items
                                    </h2>
                                </div>
                                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
                                    {orderDetails.orderItems.length} items
                                </span>
                            </div>

                            <div className="divide-y divide-gray-100">
                                {orderDetails.orderItems.map((item, index) => (
                                    <div
                                        key={index}
                                        className="p-5 sm:p-6 flex items-center justify-between gap-4 hover:bg-gray-50/70 transition-colors"
                                    >
                                        <div className="flex items-center gap-4 min-w-0">
                                            <Link
                                                to={`/products/${item.productId}`}
                                                className="shrink-0 relative group"
                                            >
                                                <img
                                                    src={item.image}
                                                    alt={item.name}
                                                    className="w-16 h-20 sm:w-20 sm:h-24 object-cover rounded-xl border border-gray-200 group-hover:scale-105 transition-transform duration-300"
                                                />
                                            </Link>
                                            <div className="min-w-0">
                                                <Link
                                                    to={`/products/${item.productId}`}
                                                    className="font-semibold text-gray-900 hover:text-rabbit-red transition-colors text-sm sm:text-base line-clamp-1"
                                                >
                                                    {item.name}
                                                </Link>
                                                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                                                    Unit Price: <span className="font-medium text-gray-700">${item.price.toFixed(2)}</span>
                                                </p>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    Quantity: <span className="font-semibold text-gray-900">{item.quantity}</span>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            <span className="text-sm sm:text-base font-bold text-gray-900">
                                                ${(item.price * item.quantity).toFixed(2)}
                                            </span>
                                            <Link
                                                to={`/products/${item.productId}`}
                                                className="hidden sm:flex items-center justify-end text-xs text-gray-400 hover:text-black gap-1 mt-1"
                                            >
                                                <span>View product</span>
                                                <ExternalLink className="w-3 h-3" />
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Shipping & Payment Info Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {/* Shipping Information Card */}
                            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <MapPin className="w-4 h-4" />
                                    </div>
                                    <h3 className="font-bold text-gray-900">Shipping Details</h3>
                                </div>

                                <div className="space-y-3 text-sm">
                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-gray-400 font-medium">
                                            Destination Address
                                        </p>
                                        {orderDetails.shippingAddress.address && (
                                            <p className="font-medium text-gray-800 mt-0.5">
                                                {orderDetails.shippingAddress.address}
                                            </p>
                                        )}
                                        <p className="font-medium text-gray-800">
                                            {orderDetails.shippingAddress.city},{" "}
                                            {orderDetails.shippingAddress.postalCode && `${orderDetails.shippingAddress.postalCode}, `}
                                            {orderDetails.shippingAddress.country}
                                        </p>
                                    </div>

                                    <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                                        <div>
                                            <p className="text-xs text-gray-400">Shipping Method</p>
                                            <p className="font-medium text-gray-800">
                                                {orderDetails.shippingMethod} Shipping
                                            </p>
                                        </div>
                                        <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md">
                                            {orderDetails.isDelivered ? "Delivered" : "In Transit"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Information Card */}
                            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                        <CreditCard className="w-4 h-4" />
                                    </div>
                                    <h3 className="font-bold text-gray-900">Payment Information</h3>
                                </div>

                                <div className="space-y-3 text-sm">
                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-gray-400 font-medium">
                                            Method
                                        </p>
                                        <p className="font-semibold text-gray-800 mt-0.5 flex items-center gap-1.5">
                                            <span>{orderDetails.paymentMethod}</span>
                                        </p>
                                    </div>

                                    <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                                        <div>
                                            <p className="text-xs text-gray-400">Payment Status</p>
                                            <p className="font-medium text-gray-800">
                                                {orderDetails.isPaid ? "Paid in Full" : "Pending Payment"}
                                            </p>
                                        </div>
                                        <span
                                            className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                                                orderDetails.isPaid
                                                    ? "bg-emerald-50 text-emerald-700"
                                                    : "bg-amber-50 text-amber-700"
                                            }`}
                                        >
                                            {orderDetails.isPaid ? "Completed" : "Unpaid"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Order Summary & Help */}
                    <div className="space-y-6">
                        {/* Order Summary Card */}
                        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
                            <h3 className="text-lg font-bold text-gray-900 mb-5">
                                Order Summary
                            </h3>

                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between text-gray-600">
                                    <span>Subtotal</span>
                                    <span className="font-medium text-gray-900">${subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>Shipping</span>
                                    <span className="font-medium text-gray-900">
                                        {shippingFee === 0 ? "Free" : `$${shippingFee.toFixed(2)}`}
                                    </span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>Estimated Tax (8%)</span>
                                    <span className="font-medium text-gray-900">${tax.toFixed(2)}</span>
                                </div>

                                <div className="pt-4 border-t border-gray-200 flex justify-between items-baseline">
                                    <span className="text-base font-bold text-gray-900">Total</span>
                                    <span className="text-2xl font-extrabold text-gray-950">
                                        ${totalAmount.toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-6 space-y-3">
                                <Link to="/" className="block">
                                    <Button className="btn-black w-full py-3 rounded-xl font-semibold text-sm">
                                        Continue Shopping
                                    </Button>
                                </Link>

                                <Link to="/profile" className="block">
                                    <button className="w-full py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-semibold transition cursor-pointer">
                                        View All Orders
                                    </button>
                                </Link>
                            </div>
                        </div>

                        {/* Customer Support Card */}
                        <div className="bg-gray-100/80 rounded-2xl p-6 border border-gray-200/60">
                            <div className="flex items-start gap-3">
                                <HelpCircle className="w-5 h-5 text-gray-700 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-bold text-sm text-gray-900">Need Assistance?</h4>
                                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                                        Have questions about this order or need to request a return? Contact our 24/7 support team.
                                    </p>
                                    <a
                                        href="mailto:support@classyshop.com"
                                        className="inline-block mt-3 text-xs font-semibold text-rabbit-red hover:underline"
                                    >
                                        support@classyshop.com
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderDetails;
