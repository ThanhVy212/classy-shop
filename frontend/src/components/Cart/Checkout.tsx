import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    ChevronLeft,
    ShieldCheck,
    Lock,
    Truck,
    CreditCard,
    Check,
    Tag,
    ShoppingBag
} from "lucide-react";
import { sampleCartProducts } from "../../constants";
import Button from "../Common/Button.tsx";
import { toast } from "sonner";

interface ShippingFormData {
    email: string;
    newsletter: boolean;
    firstName: string;
    lastName: string;
    address: string;
    apartment: string;
    city: string;
    postalCode: string;
    country: string;
    phone: string;
    saveInfo: boolean;
}

const Checkout = () => {
    const navigate = useNavigate();

    // Mock cart items based on provided sample data
    const [cartItems] = useState(sampleCartProducts);

    // Form inputs state
    const [formData, setFormData] = useState<ShippingFormData>({
        email: "customer@example.com",
        newsletter: true,
        firstName: "John",
        lastName: "Doe",
        address: "123 Broadway Avenue",
        apartment: "Apt 4B",
        city: "New York",
        postalCode: "10001",
        country: "United States",
        phone: "+1 (555) 234-5678",
        saveInfo: true,
    });

    // Shipping & payment methods
    const [shippingMethod, setShippingMethod] = useState<"standard" | "express">("standard");
    const [paymentMethod, setPaymentMethod] = useState<"paypal" | "card" | "cod">("paypal");

    // Credit card mock inputs
    const [cardData, setCardData] = useState({
        cardNumber: "•••• •••• •••• 4242",
        cardName: "John Doe",
        expiry: "12/28",
        cvv: "123",
    });

    // Promo code state
    const [promoCode, setPromoCode] = useState("");
    const [discount, setDiscount] = useState(0);
    const [appliedCode, setAppliedCode] = useState<string | null>(null);

    // Calculations
    const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const shippingCost = shippingMethod === "express" ? 15 : 0;
    const tax = Math.round(subtotal * 0.08 * 100) / 100;
    const total = Math.max(0, subtotal + shippingCost + tax - discount);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === "checkbox") {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData((prev) => ({ ...prev, [name]: checked }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleApplyPromo = (e: React.FormEvent) => {
        e.preventDefault();
        if (!promoCode.trim()) return;

        if (promoCode.trim().toUpperCase() === "CLASSY10" || promoCode.trim().toUpperCase() === "SAVE10") {
            const discValue = Math.round(subtotal * 0.1 * 100) / 100;
            setDiscount(discValue);
            setAppliedCode(promoCode.trim().toUpperCase());
            toast.success("Promo code applied: 10% discount!");
        } else {
            // Give flat $10 discount for demo
            setDiscount(10);
            setAppliedCode(promoCode.trim().toUpperCase());
            toast.success(`Promo code "${promoCode}" applied (-$10.00)!`);
        }
        setPromoCode("");
    };

    const handleRemovePromo = () => {
        setDiscount(0);
        setAppliedCode(null);
        toast.info("Promo code removed");
    };

    /* ====================================================================
       TODO: PAYMENT HANDLE
       This function is the primary checkout trigger for handling payments
       (e.g., Stripe payment intent, PayPal SDK capture, COD order creation).
       ==================================================================== */
    const handlePayment = (e: React.FormEvent) => {
        e.preventDefault();

        // TODO: payment handle
        console.log("TODO: payment handle - processing payment with details:", {
            formData,
            shippingMethod,
            paymentMethod,
            cardData: paymentMethod === "card" ? cardData : undefined,
            items: cartItems,
            subtotal,
            shippingCost,
            tax,
            discount,
            total,
        });

        toast.success("Order placed successfully! (TODO: payment handle executed)", {
            description: `Payment via ${paymentMethod.toUpperCase()} for $${total.toFixed(2)}`,
        });

        // Navigate to Order Details page for demo testing
        const mockOrderId = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
        navigate(`/order/${mockOrderId}`);
    };

    return (
        <div className="bg-gray-50/50 min-h-screen py-8 sm:py-12">
            <div className="container mx-auto px-4 max-w-6xl">
                {/* Breadcrumbs */}
                <div className="flex items-center text-xs sm:text-sm text-gray-500 mb-6">
                    <Link to="/" className="hover:text-black transition-colors">
                        Cart
                    </Link>
                    <span className="mx-2">/</span>
                    <span className="font-semibold text-gray-900">Checkout</span>
                    <span className="mx-2">/</span>
                    <span className="text-gray-400">Confirmation</span>
                </div>

                <form onSubmit={handlePayment}>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                        {/* ================= LEFT COLUMN: CHECKOUT FORM ================= */}
                        <div className="lg:col-span-7 space-y-8">
                            {/* Contact Information */}
                            <div className="card-padded p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="card-title">
                                        Contact Information
                                    </h2>
                                    <span className="text-xs text-gray-500">
                                        Already have an account?{" "}
                                        <Link to="/login" className="text-black font-semibold underline">
                                            Log in
                                        </Link>
                                    </span>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="form-label">
                                            Email Address *
                                        </label>
                                        <input
                                            type="email"
                                            name="email"
                                            required
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            placeholder="you@example.com"
                                            className="form-input"
                                        />
                                    </div>

                                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 select-none">
                                        <input
                                            type="checkbox"
                                            name="newsletter"
                                            checked={formData.newsletter}
                                            onChange={handleInputChange}
                                            className="form-checkbox"
                                        />
                                        <span>Email me with news and exclusive discounts</span>
                                    </label>
                                </div>
                            </div>

                            {/* Shipping Address */}
                            <div className="card-padded p-6">
                                <h2 className="card-title mb-4">
                                    Shipping Address
                                </h2>

                                <div className="space-y-4">
                                    {/* Country */}
                                    <div>
                                        <label className="form-label">
                                            Country / Region *
                                        </label>
                                        <select
                                            name="country"
                                            value={formData.country}
                                            onChange={handleInputChange}
                                            className="form-select"
                                        >
                                            <option value="United States">United States</option>
                                            <option value="Vietnam">Vietnam</option>
                                            <option value="Canada">Canada</option>
                                            <option value="United Kingdom">United Kingdom</option>
                                            <option value="Australia">Australia</option>
                                        </select>
                                    </div>

                                    {/* First & Last Name */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="form-label">
                                                First Name *
                                            </label>
                                            <input
                                                type="text"
                                                name="firstName"
                                                required
                                                value={formData.firstName}
                                                onChange={handleInputChange}
                                                placeholder="John"
                                                className="form-input"
                                            />
                                        </div>
                                        <div>
                                            <label className="form-label">
                                                Last Name *
                                            </label>
                                            <input
                                                type="text"
                                                name="lastName"
                                                required
                                                value={formData.lastName}
                                                onChange={handleInputChange}
                                                placeholder="Doe"
                                                className="form-input"
                                            />
                                        </div>
                                    </div>

                                    {/* Street Address */}
                                    <div>
                                        <label className="form-label">
                                            Street Address *
                                        </label>
                                        <input
                                            type="text"
                                            name="address"
                                            required
                                            value={formData.address}
                                            onChange={handleInputChange}
                                            placeholder="123 Broadway Avenue"
                                            className="form-input"
                                        />
                                    </div>

                                    {/* Apartment / Suite */}
                                    <div>
                                        <label className="form-label">
                                            Apartment, suite, unit (optional)
                                        </label>
                                        <input
                                            type="text"
                                            name="apartment"
                                            value={formData.apartment}
                                            onChange={handleInputChange}
                                            placeholder="Apt 4B"
                                            className="form-input"
                                        />
                                    </div>

                                    {/* City & Postal Code */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="form-label">
                                                City *
                                            </label>
                                            <input
                                                type="text"
                                                name="city"
                                                required
                                                value={formData.city}
                                                onChange={handleInputChange}
                                                placeholder="New York"
                                                className="form-input"
                                            />
                                        </div>
                                        <div>
                                            <label className="form-label">
                                                Postal / ZIP Code *
                                            </label>
                                            <input
                                                type="text"
                                                name="postalCode"
                                                required
                                                value={formData.postalCode}
                                                onChange={handleInputChange}
                                                placeholder="10001"
                                                className="form-input"
                                            />
                                        </div>
                                    </div>

                                    {/* Phone Number */}
                                    <div>
                                        <label className="form-label">
                                            Phone Number *
                                        </label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            required
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            placeholder="+1 (555) 234-5678"
                                            className="form-input"
                                        />
                                    </div>

                                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 select-none pt-1">
                                        <input
                                            type="checkbox"
                                            name="saveInfo"
                                            checked={formData.saveInfo}
                                            onChange={handleInputChange}
                                            className="form-checkbox"
                                        />
                                        <span>Save this information for a faster checkout next time</span>
                                    </label>
                                </div>
                            </div>

                            {/* Shipping Method */}
                            <div className="card-padded p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Truck className="w-5 h-5 text-gray-700" />
                                    <h2 className="card-title">
                                        Shipping Method
                                    </h2>
                                </div>

                                <div className="space-y-3">
                                    <label
                                        onClick={() => setShippingMethod("standard")}
                                        className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                                            shippingMethod === "standard"
                                                ? "border-black bg-gray-50/80 ring-1 ring-black"
                                                : "border-gray-200 hover:border-gray-300"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                                    shippingMethod === "standard"
                                                        ? "border-black bg-black text-white"
                                                        : "border-gray-300"
                                                }`}
                                            >
                                                {shippingMethod === "standard" && (
                                                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm text-gray-900">
                                                    Standard Delivery
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    Estimated delivery: 3–5 business days
                                                </p>
                                            </div>
                                        </div>
                                        <span className="font-bold text-sm text-emerald-600">
                                            FREE
                                        </span>
                                    </label>

                                    <label
                                        onClick={() => setShippingMethod("express")}
                                        className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                                            shippingMethod === "express"
                                                ? "border-black bg-gray-50/80 ring-1 ring-black"
                                                : "border-gray-200 hover:border-gray-300"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                                    shippingMethod === "express"
                                                        ? "border-black bg-black text-white"
                                                        : "border-gray-300"
                                                }`}
                                            >
                                                {shippingMethod === "express" && (
                                                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm text-gray-900">
                                                    Express Priority Delivery
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    Estimated delivery: 1–2 business days
                                                </p>
                                            </div>
                                        </div>
                                        <span className="font-bold text-sm text-gray-900">
                                            $15.00
                                        </span>
                                    </label>
                                </div>
                            </div>

                            {/* Payment Method */}
                            <div className="card-padded p-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <CreditCard className="w-5 h-5 text-gray-700" />
                                    <h2 className="card-title">
                                        Payment Method
                                    </h2>
                                </div>
                                <p className="text-xs text-gray-500 mb-4">
                                    All transactions are secure and encrypted.
                                </p>

                                <div className="space-y-3">
                                    {/* PayPal Option */}
                                    <div
                                        className={`border rounded-xl transition-all ${
                                            paymentMethod === "paypal"
                                                ? "border-black bg-gray-50/50 ring-1 ring-black"
                                                : "border-gray-200"
                                        }`}
                                    >
                                        <div
                                            onClick={() => setPaymentMethod("paypal")}
                                            className="flex items-center justify-between p-4 cursor-pointer"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                                        paymentMethod === "paypal"
                                                            ? "border-black bg-black"
                                                            : "border-gray-300"
                                                    }`}
                                                >
                                                    {paymentMethod === "paypal" && (
                                                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                                    )}
                                                </div>
                                                <span className="font-semibold text-sm text-gray-900">
                                                    PayPal
                                                </span>
                                            </div>
                                            <span className="font-bold italic text-blue-900 text-sm">
                                                Pay<span className="text-blue-500">Pal</span>
                                            </span>
                                        </div>

                                        {paymentMethod === "paypal" && (
                                            <div className="px-4 pb-4 pt-1 text-xs text-gray-600 border-t border-gray-100 mt-2 space-y-3">
                                                <p>
                                                    After clicking "Pay with PayPal", you will be safely directed to complete your purchase.
                                                </p>
                                                {/* TODO: payment handle - PayPal branded button */}
                                                <button
                                                    type="button"
                                                    onClick={handlePayment}
                                                    className="w-full bg-[#ffc439] hover:bg-[#f4b82d] text-gray-900 font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition duration-200 cursor-pointer shadow-xs"
                                                >
                                                    <span className="font-bold italic text-blue-900">Pay</span>
                                                    <span className="font-bold italic text-blue-600">Pal</span>
                                                    <span className="text-xs text-gray-700 ml-1 font-mono">
                                                        (TODO: payment handle)
                                                    </span>
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Credit Card Option */}
                                    <div
                                        className={`border rounded-xl transition-all ${
                                            paymentMethod === "card"
                                                ? "border-black bg-gray-50/50 ring-1 ring-black"
                                                : "border-gray-200"
                                        }`}
                                    >
                                        <div
                                            onClick={() => setPaymentMethod("card")}
                                            className="flex items-center justify-between p-4 cursor-pointer"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                                        paymentMethod === "card"
                                                            ? "border-black bg-black"
                                                            : "border-gray-300"
                                                    }`}
                                                >
                                                    {paymentMethod === "card" && (
                                                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                                    )}
                                                </div>
                                                <span className="font-semibold text-sm text-gray-900">
                                                    Credit / Debit Card
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                                                    VISA
                                                </span>
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                                                    MC
                                                </span>
                                            </div>
                                        </div>

                                        {paymentMethod === "card" && (
                                            <div className="p-4 border-t border-gray-100 space-y-3 bg-white rounded-b-xl">
                                                <div>
                                                    <label className="form-label">
                                                        Card Number
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={cardData.cardNumber}
                                                        onChange={(e) =>
                                                            setCardData({ ...cardData, cardNumber: e.target.value })
                                                        }
                                                        placeholder="4242 •••• •••• 4242"
                                                        className="form-input font-mono"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="form-label">
                                                            Expiration (MM/YY)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={cardData.expiry}
                                                            onChange={(e) =>
                                                                setCardData({ ...cardData, expiry: e.target.value })
                                                            }
                                                            placeholder="MM/YY"
                                                            className="form-input font-mono"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="form-label">
                                                            Security Code (CVV)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={cardData.cvv}
                                                            onChange={(e) =>
                                                                setCardData({ ...cardData, cvv: e.target.value })
                                                            }
                                                            placeholder="123"
                                                            className="form-input font-mono"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Cash on Delivery Option */}
                                    <div
                                        className={`border rounded-xl transition-all ${
                                            paymentMethod === "cod"
                                                ? "border-black bg-gray-50/50 ring-1 ring-black"
                                                : "border-gray-200"
                                        }`}
                                    >
                                        <div
                                            onClick={() => setPaymentMethod("cod")}
                                            className="flex items-center justify-between p-4 cursor-pointer"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                                        paymentMethod === "cod"
                                                            ? "border-black bg-black"
                                                            : "border-gray-300"
                                                    }`}
                                                >
                                                    {paymentMethod === "cod" && (
                                                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                                    )}
                                                </div>
                                                <span className="font-semibold text-sm text-gray-900">
                                                    Cash on Delivery (COD)
                                                </span>
                                            </div>
                                            <span className="text-xs font-medium text-gray-500">
                                                Pay at door
                                            </span>
                                        </div>

                                        {paymentMethod === "cod" && (
                                            <div className="px-4 pb-4 pt-1 text-xs text-gray-600 border-t border-gray-100">
                                                You can pay with cash directly to our delivery courier upon receiving your items.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* ================= BUTTON: TODO: PAYMENT HANDLE ================= */}
                            <div className="pt-2 space-y-4">
                                {/* TODO: payment handle */}
                                <Button
                                    type="submit"
                                    className="btn-black w-full py-4 rounded-xl font-semibold text-base sm:text-lg flex items-center justify-center gap-2.5 shadow-sm"
                                >
                                    <Lock className="w-5 h-5 text-gray-400" />
                                    <span>Complete Order &middot; ${total.toFixed(2)}</span>
                                    <span className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded font-mono ml-1">
                                        TODO: payment handle
                                    </span>
                                </Button>

                                <div className="flex items-center justify-between pt-2">
                                    <Link
                                        to="/"
                                        className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-black transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4 mr-1" />
                                        Return to Shopping
                                    </Link>

                                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                        <span>256-bit SSL Secure Checkout</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ================= RIGHT COLUMN: ORDER SUMMARY ================= */}
                        <div className="lg:col-span-5">
                            <div className="card-padded sticky top-28 space-y-6">
                                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <ShoppingBag className="w-5 h-5 text-gray-700" />
                                        <h3 className="card-title">
                                            Order Summary
                                        </h3>
                                    </div>
                                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
                                        {cartItems.reduce((acc, i) => acc + i.quantity, 0)} items
                                    </span>
                                </div>

                                {/* Cart Item List */}
                                <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto better-scrollbar pr-1">
                                    {cartItems.map((item, index) => (
                                        <div key={index} className="py-3.5 flex items-center gap-3">
                                            <div className="relative shrink-0">
                                                <img
                                                    src={item.image}
                                                    alt={item.name}
                                                    className="w-16 h-18 object-cover rounded-xl border border-gray-200"
                                                />
                                                <span className="absolute -top-1.5 -right-1.5 bg-gray-800 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                                                    {item.quantity}
                                                </span>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold text-sm text-gray-900 truncate">
                                                    {item.name}
                                                </h4>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    Size: {item.size} &middot; Color: {item.color}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                    ${item.price.toFixed(2)} each
                                                </p>
                                            </div>

                                            <div className="text-right shrink-0">
                                                <span className="font-bold text-sm text-gray-900">
                                                    ${(item.price * item.quantity).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Promo Code Box */}
                                <div className="pt-2">
                                    {appliedCode ? (
                                        <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                                            <div className="flex items-center gap-1.5">
                                                <Tag className="w-3.5 h-3.5" />
                                                <span>Coupon <strong>{appliedCode}</strong> applied (-${discount.toFixed(2)})</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleRemovePromo}
                                                className="text-emerald-700 hover:text-emerald-900 font-semibold underline cursor-pointer"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={promoCode}
                                                onChange={(e) => setPromoCode(e.target.value)}
                                                placeholder="Discount code (try CLASSY10)"
                                                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-xs uppercase focus:outline-none focus:ring-2 focus:ring-black"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleApplyPromo}
                                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-xs rounded-lg transition cursor-pointer"
                                            >
                                                Apply
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Cost Breakdown */}
                                <div className="space-y-2.5 text-sm pt-4 border-t border-gray-100">
                                    <div className="flex justify-between text-gray-600">
                                        <span>Subtotal</span>
                                        <span className="font-medium text-gray-900">${subtotal.toFixed(2)}</span>
                                    </div>

                                    <div className="flex justify-between text-gray-600">
                                        <span>Shipping ({shippingMethod === "express" ? "Express" : "Standard"})</span>
                                        <span className="font-medium text-gray-900">
                                            {shippingCost === 0 ? "Free" : `$${shippingCost.toFixed(2)}`}
                                        </span>
                                    </div>

                                    <div className="flex justify-between text-gray-600">
                                        <span>Estimated Tax (8%)</span>
                                        <span className="font-medium text-gray-900">${tax.toFixed(2)}</span>
                                    </div>

                                    {discount > 0 && (
                                        <div className="flex justify-between text-emerald-700 font-medium">
                                            <span>Discount</span>
                                            <span>-${discount.toFixed(2)}</span>
                                        </div>
                                    )}

                                    <div className="pt-3 border-t border-gray-200 flex justify-between items-baseline">
                                        <div>
                                            <span className="text-base font-bold text-gray-900 block">Total</span>
                                            <span className="text-[11px] text-gray-400">Including all taxes and fees</span>
                                        </div>
                                        <span className="text-2xl font-extrabold text-gray-950">
                                            ${total.toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                {/* Security and Guarantee Highlights */}
                                <div className="pt-4 border-t border-gray-100 space-y-2 text-xs text-gray-500">
                                    <div className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-emerald-600" />
                                        <span>Free 30-day return policy</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-emerald-600" />
                                        <span>Official brand warranty guarantee</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Checkout;
