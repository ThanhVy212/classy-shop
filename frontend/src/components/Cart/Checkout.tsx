import {
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
    type FormEvent,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    ArrowRight,
    Banknote,
    Check,
    CreditCard,
    Lock,
    Minus,
    Plus,
    RefreshCcw,
    ShieldCheck,
    ShoppingBag,
    Tag,
    Trash2,
    Truck,
    Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { useCart } from "../../hooks/useCart.ts";
import { useAuth } from "../../hooks/useAuth.ts";
import { useSyncedCart } from "../../hooks/useSyncedCart.ts";
import type { SyncedCartLine } from "../../hooks/useSyncedCart.ts";
import { getColorStyle } from "../../utils/colors.ts";
import Button from "../Common/Button.tsx";

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

const COUNTRIES = [
    "United States",
    "Vietnam",
    "Canada",
    "United Kingdom",
    "Australia",
    "Singapore",
    "Japan",
    "South Korea",
    "France",
    "Germany",
];

const PROMO_CODES: Record<string, number> = {
    CLASSY10: 0.1,
    WELCOME15: 0.15,
};

const getItemKey = (productId: string, size: string, color: string) =>
    `${productId}-${size}-${color}`;

const Checkout = () => {
    const navigate = useNavigate();
    const {
        refreshCart,
        updateQuantity,
        removeFromCart,
        isLoading: cartLoading,
    } = useCart();
    const { isAuthenticated, isLoading: authLoading, user } = useAuth();

    const [formData, setFormData] = useState<ShippingFormData>(() => {
        const nameParts = (user?.name || "").trim().split(/\s+/).filter(Boolean);

        return {
            email: user?.email || "",
            newsletter: true,
            firstName: nameParts[0] || "",
            lastName: nameParts.slice(1).join(" "),
            address: "",
            apartment: "",
            city: "",
            postalCode: "",
            country: "United States",
            phone: "",
            saveInfo: true,
        };
    });

    const [shippingMethod, setShippingMethod] = useState<"standard" | "express">(
        "standard"
    );
    const [promoCode, setPromoCode] = useState("");
    const [appliedCode, setAppliedCode] = useState<string | null>(null);
    const [updatingKey, setUpdatingKey] = useState<string | null>(null);

    const hasRequestedCart = useRef(false);

    // Make sure the bag is re-fetched from the cart API when checkout opens.
    useEffect(() => {
        if (!isAuthenticated || hasRequestedCart.current) return;
        hasRequestedCart.current = true;
        void refreshCart();
    }, [isAuthenticated, refreshCart]);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            toast.info("Please log in to proceed to checkout", {
                duration: 2500,
            });
            navigate("/login?redirect=checkout", {
                replace: true,
                state: { from: { pathname: "/checkout" } },
            });
        }
    }, [isAuthenticated, authLoading, navigate]);

    useEffect(() => {
        if (!user) return;

        const nameParts = (user.name || "").trim().split(/\s+/).filter(Boolean);
        setFormData((prev) => ({
            ...prev,
            email: prev.email || user.email || "",
            firstName: prev.firstName || nameParts[0] || "",
            lastName: prev.lastName || nameParts.slice(1).join(" ") || "",
        }));
    }, [user]);

    // Live cart lines: latest name, image, price and stock from the product API.
    const {
        items: checkoutItems,
        subtotal,
        savings,
        itemCount,
        isSyncing,
    } = useSyncedCart();

    const shippingCost = shippingMethod === "express" ? 15 : 0;
    const discount = appliedCode ? subtotal * (PROMO_CODES[appliedCode] || 0) : 0;
    const tax = Math.round(subtotal * 0.08 * 100) / 100;
    const total = Math.max(0, subtotal + shippingCost + tax - discount);

    const handleInputChange = (
        event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const target = event.target;

        if (target instanceof HTMLInputElement && target.type === "checkbox") {
            const { name, checked } = target;
            setFormData((prev) => ({ ...prev, [name]: checked }));
            return;
        }

        const { name, value } = target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleApplyPromo = () => {
        const code = promoCode.trim().toUpperCase();
        if (!code) return;

        const rate = PROMO_CODES[code];
        if (!rate) {
            toast.error("That promo code isn't valid.");
            return;
        }

        setAppliedCode(code);
        setPromoCode("");
        toast.success(
            `${code} applied — ${Math.round(rate * 100)}% off your order`
        );
    };

    const handleRemovePromo = () => {
        setAppliedCode(null);
        toast.info("Promo code removed");
    };

    const handleQuantityChange = async (item: SyncedCartLine, next: number) => {
        if (next < 1) return;

        if (item.stock !== undefined && next > item.stock) {
            toast.error(`Only ${item.stock} left in stock.`);
            return;
        }

        const key = getItemKey(item.productId, item.size, item.color);
        setUpdatingKey(key);

        try {
            await updateQuantity(
                item.productId,
                item.size,
                item.color,
                next
            );
        } catch {
            toast.error("Could not update the quantity.");
        } finally {
            setUpdatingKey(null);
        }
    };

    const handleRemoveItem = async (item: SyncedCartLine) => {
        const key = getItemKey(item.productId, item.size, item.color);
        setUpdatingKey(key);

        try {
            await removeFromCart(item.productId, item.size, item.color);
            toast.success("Item removed from your bag");
        } catch {
            toast.error("Could not remove this item.");
        } finally {
            setUpdatingKey(null);
        }
    };

    /* ====================================================================
       TODO: PAYMENT HANDLE
       Payment is intentionally not connected yet. This trigger only
       validates/reports the synced checkout payload — no order is created
       and no charge is made. Wire Stripe/PayPal/COD here later.
       ==================================================================== */
    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();

        const unavailableItem = checkoutItems.find((item) => !item.inStock);
        if (unavailableItem) {
            toast.error(`${unavailableItem.name} is out of stock`, {
                description: "Remove it from your bag to continue.",
            });
            return;
        }

        console.log("[checkout] Ready for payment integration:", {
            customer: formData,
            shippingMethod,
            items: checkoutItems,
            subtotal,
            shippingCost,
            tax,
            discount,
            total,
        });

        toast.info("Payment isn't connected yet", {
            description:
                "Your bag and totals are synced. Payment will be enabled in a future update.",
        });
    };

    if (authLoading || (cartLoading && checkoutItems.length === 0)) {
        return (
            <div className="flex min-h-[70vh] items-center justify-center bg-[var(--color-canvas)]">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]" />
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-ink-muted)]">
                        Preparing checkout
                    </p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    if (checkoutItems.length === 0) {
        return (
            <div className="min-h-[75vh] bg-[var(--color-canvas)] px-4 py-20">
                <div className="mx-auto flex max-w-md flex-col items-center text-center">
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                        <ShoppingBag className="h-7 w-7" />
                    </span>
                    <h1 className="mt-6 text-2xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-3xl">
                        Your bag is empty
                    </h1>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-soft)]">
                        Add a piece you love and come back — your bag, stock and
                        prices stay in sync with the catalog.
                    </p>
                    <Link
                        to="/collections/all"
                        className="checkout-primary-button mt-8 max-w-xs"
                    >
                        Continue shopping
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--color-canvas)] pb-16 pt-8 sm:pt-10">
            <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
                <Link
                    to="/collections/all"
                    className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-primary)]"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Continue shopping
                </Link>

                <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--color-ink-muted)]">
                            Secure checkout
                        </p>
                        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-4xl">
                            Almost yours.
                        </h1>
                        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--color-ink-soft)]">
                            One last step — confirm your details and we'll have
                            your order wrapped and ready.
                        </p>
                    </div>

                    <ol className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em]">
                        <li>
                            <Link
                                to="/cart"
                                className="text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-primary)]"
                            >
                                Bag
                            </Link>
                        </li>
                        <li className="text-[var(--color-border-strong)]">/</li>
                        <li className="text-[var(--color-primary)]">Details</li>
                        <li className="text-[var(--color-border-strong)]">/</li>
                        <li className="text-[var(--color-ink-muted)]">Payment</li>
                    </ol>
                </div>

                <form onSubmit={handleSubmit} className="mt-8 sm:mt-10">
                    <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-10">
                        {/* ================= LEFT: CHECKOUT FORM ================= */}
                        <div className="space-y-6 lg:col-span-7">
                            {/* Contact */}
                            <section className="checkout-card p-6 sm:p-8">
                                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-border)] pb-4">
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[var(--color-ink-muted)]">
                                            01 — Contact
                                        </p>
                                        <h2 className="mt-1.5 text-lg font-semibold text-[var(--color-ink)]">
                                            Contact information
                                        </h2>
                                    </div>
                                    {user && (
                                        <span className="rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-[11px] font-medium text-[var(--color-primary)]">
                                            Signed in as {user.email}
                                        </span>
                                    )}
                                </div>

                                <div className="mt-5 space-y-4">
                                    <div>
                                        <label
                                            className="form-label"
                                            htmlFor="email"
                                        >
                                            Email address *
                                        </label>
                                        <input
                                            id="email"
                                            type="email"
                                            name="email"
                                            required
                                            autoComplete="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            placeholder="you@example.com"
                                            className="form-input"
                                        />
                                    </div>

                                    <label className="flex cursor-pointer items-start gap-3 text-sm text-[var(--color-ink-soft)]">
                                        <input
                                            type="checkbox"
                                            name="newsletter"
                                            checked={formData.newsletter}
                                            onChange={handleInputChange}
                                            className="form-checkbox mt-0.5"
                                        />
                                        <span>
                                            Email me with new arrivals and
                                            exclusive offers. No noise, just the
                                            good stuff.
                                        </span>
                                    </label>
                                </div>
                            </section>

                            {/* Shipping address */}
                            <section className="checkout-card p-6 sm:p-8">
                                <div className="border-b border-[var(--color-border)] pb-4">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[var(--color-ink-muted)]">
                                        02 — Delivery address
                                    </p>
                                    <h2 className="mt-1.5 text-lg font-semibold text-[var(--color-ink)]">
                                        Where should it go?
                                    </h2>
                                </div>

                                <div className="mt-5 space-y-4">
                                    <div>
                                        <label
                                            className="form-label"
                                            htmlFor="country"
                                        >
                                            Country / region *
                                        </label>
                                        <select
                                            id="country"
                                            name="country"
                                            required
                                            value={formData.country}
                                            onChange={handleInputChange}
                                            className="form-select"
                                        >
                                            {COUNTRIES.map((country) => (
                                                <option
                                                    key={country}
                                                    value={country}
                                                >
                                                    {country}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <label
                                                className="form-label"
                                                htmlFor="firstName"
                                            >
                                                First name *
                                            </label>
                                            <input
                                                id="firstName"
                                                type="text"
                                                name="firstName"
                                                required
                                                autoComplete="given-name"
                                                value={formData.firstName}
                                                onChange={handleInputChange}
                                                placeholder="First name"
                                                className="form-input"
                                            />
                                        </div>
                                        <div>
                                            <label
                                                className="form-label"
                                                htmlFor="lastName"
                                            >
                                                Last name *
                                            </label>
                                            <input
                                                id="lastName"
                                                type="text"
                                                name="lastName"
                                                required
                                                autoComplete="family-name"
                                                value={formData.lastName}
                                                onChange={handleInputChange}
                                                placeholder="Last name"
                                                className="form-input"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label
                                            className="form-label"
                                            htmlFor="address"
                                        >
                                            Street address *
                                        </label>
                                        <input
                                            id="address"
                                            type="text"
                                            name="address"
                                            required
                                            autoComplete="street-address"
                                            value={formData.address}
                                            onChange={handleInputChange}
                                            placeholder="Street and house number"
                                            className="form-input"
                                        />
                                    </div>

                                    <div>
                                        <label
                                            className="form-label"
                                            htmlFor="apartment"
                                        >
                                            Apartment, suite, unit (optional)
                                        </label>
                                        <input
                                            id="apartment"
                                            type="text"
                                            name="apartment"
                                            autoComplete="address-line2"
                                            value={formData.apartment}
                                            onChange={handleInputChange}
                                            placeholder="Apt, floor, building"
                                            className="form-input"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <label
                                                className="form-label"
                                                htmlFor="city"
                                            >
                                                City *
                                            </label>
                                            <input
                                                id="city"
                                                type="text"
                                                name="city"
                                                required
                                                autoComplete="address-level2"
                                                value={formData.city}
                                                onChange={handleInputChange}
                                                placeholder="City"
                                                className="form-input"
                                            />
                                        </div>
                                        <div>
                                            <label
                                                className="form-label"
                                                htmlFor="postalCode"
                                            >
                                                Postal / ZIP code *
                                            </label>
                                            <input
                                                id="postalCode"
                                                type="text"
                                                name="postalCode"
                                                required
                                                autoComplete="postal-code"
                                                value={formData.postalCode}
                                                onChange={handleInputChange}
                                                placeholder="Postal code"
                                                className="form-input"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label
                                            className="form-label"
                                            htmlFor="phone"
                                        >
                                            Phone number *
                                        </label>
                                        <input
                                            id="phone"
                                            type="tel"
                                            name="phone"
                                            required
                                            autoComplete="tel"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            placeholder="For delivery updates"
                                            className="form-input"
                                        />
                                    </div>

                                    <label className="flex cursor-pointer items-start gap-3 pt-1 text-sm text-[var(--color-ink-soft)]">
                                        <input
                                            type="checkbox"
                                            name="saveInfo"
                                            checked={formData.saveInfo}
                                            onChange={handleInputChange}
                                            className="form-checkbox mt-0.5"
                                        />
                                        <span>
                                            Save this information for a faster
                                            checkout next time.
                                        </span>
                                    </label>
                                </div>
                            </section>

                            {/* Delivery method */}
                            <section className="checkout-card p-6 sm:p-8">
                                <div className="flex items-center gap-2.5 border-b border-[var(--color-border)] pb-4">
                                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                                        <Truck className="h-4 w-4" />
                                    </span>
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[var(--color-ink-muted)]">
                                            03 — Delivery
                                        </p>
                                        <h2 className="mt-0.5 text-lg font-semibold text-[var(--color-ink)]">
                                            Shipping method
                                        </h2>
                                    </div>
                                </div>

                                <div className="mt-5 grid gap-3">
                                    <label
                                        className={`flex cursor-pointer items-center justify-between gap-4 rounded-2xl border p-4 transition-all ${
                                            shippingMethod === "standard"
                                                ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]/50 ring-1 ring-[var(--color-primary)]"
                                                : "border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-muted)]/40"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="radio"
                                                name="shippingMethod"
                                                value="standard"
                                                checked={
                                                    shippingMethod === "standard"
                                                }
                                                onChange={() =>
                                                    setShippingMethod("standard")
                                                }
                                                className="form-radio"
                                            />
                                            <div>
                                                <p className="text-sm font-semibold text-[var(--color-ink)]">
                                                    Standard delivery
                                                </p>
                                                <p className="mt-0.5 text-xs text-[var(--color-ink-soft)]">
                                                    Estimated 3–5 business days
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-sm font-semibold text-[var(--color-success)]">
                                            Free
                                        </span>
                                    </label>

                                    <label
                                        className={`flex cursor-pointer items-center justify-between gap-4 rounded-2xl border p-4 transition-all ${
                                            shippingMethod === "express"
                                                ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]/50 ring-1 ring-[var(--color-primary)]"
                                                : "border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-muted)]/40"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="radio"
                                                name="shippingMethod"
                                                value="express"
                                                checked={
                                                    shippingMethod === "express"
                                                }
                                                onChange={() =>
                                                    setShippingMethod("express")
                                                }
                                                className="form-radio"
                                            />
                                            <div>
                                                <p className="text-sm font-semibold text-[var(--color-ink)]">
                                                    Express priority
                                                </p>
                                                <p className="mt-0.5 text-xs text-[var(--color-ink-soft)]">
                                                    Estimated 1–2 business days
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-sm font-semibold text-[var(--color-ink)]">
                                            $15.00
                                        </span>
                                    </label>
                                </div>
                            </section>

                            {/* Payment placeholder */}
                            <section className="checkout-card p-6 sm:p-8">
                                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-border)] pb-4">
                                    <div className="flex items-center gap-2.5">
                                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                                            <CreditCard className="h-4 w-4" />
                                        </span>
                                        <div>
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[var(--color-ink-muted)]">
                                                04 — Payment
                                            </p>
                                            <h2 className="mt-0.5 text-lg font-semibold text-[var(--color-ink)]">
                                                Payment method
                                            </h2>
                                        </div>
                                    </div>
                                    <span className="rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent-soft)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-accent)]">
                                        Coming soon
                                    </span>
                                </div>

                                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                                    {[
                                        {
                                            label: "Credit / debit card",
                                            icon: CreditCard,
                                        },
                                        { label: "PayPal", icon: Wallet },
                                        {
                                            label: "Cash on delivery",
                                            icon: Banknote,
                                        },
                                    ].map(({ label, icon: Icon }) => (
                                        <div
                                            key={label}
                                            className="flex items-center gap-2 rounded-xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-muted)]/40 px-3 py-3 text-xs font-medium text-[var(--color-ink-soft)]"
                                        >
                                            <Icon className="h-4 w-4 shrink-0 text-[var(--color-ink-muted)]" />
                                            <span>{label}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-[var(--color-primary-soft)] px-4 py-3 text-xs leading-relaxed text-[var(--color-primary)]">
                                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                                    <p>
                                        Payment isn't connected yet. Your bag,
                                        live prices, stock and totals are already
                                        synced — no charge will be made at this
                                        step.
                                    </p>
                                </div>
                            </section>

                            <div className="space-y-3 pt-1">
                                <Button
                                    type="submit"
                                    className="checkout-primary-button group"
                                >
                                    <Lock className="h-4 w-4" />
                                    <span>
                                        {`Continue to payment · $${total.toFixed(2)}`}
                                    </span>
                                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                                </Button>

                                <p className="text-center text-[11px] leading-relaxed text-[var(--color-ink-muted)]">
                                    Payment integration coming soon. Your
                                    details stay on this device.
                                </p>

                                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                                    <Link
                                        to="/collections/all"
                                        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-primary)]"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        Return to shopping
                                    </Link>

                                    <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-ink-soft)]">
                                        <ShieldCheck className="h-4 w-4 text-[var(--color-success)]" />
                                        256-bit SSL secure checkout
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* ================= RIGHT: ORDER SUMMARY ================= */}
                        <aside className="lg:col-span-5">
                            <div className="checkout-card overflow-hidden lg:sticky lg:top-24">
                                <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] p-6">
                                    <div className="flex items-center gap-2.5">
                                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                                            <ShoppingBag className="h-4 w-4" />
                                        </span>
                                        <div>
                                            <h2 className="text-sm font-semibold text-[var(--color-ink)]">
                                                Order summary
                                            </h2>
                                            <p className="text-xs text-[var(--color-ink-soft)]">
                                                {itemCount}{" "}
                                                {itemCount === 1
                                                    ? "item"
                                                    : "items"}{" "}
                                                in your bag
                                            </p>
                                        </div>
                                    </div>

                                    <span
                                        title="Prices are synced from the product catalog"
                                        className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface-muted)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-soft)]"
                                    >
                                        <RefreshCcw
                                            className={`h-3 w-3 ${
                                                isSyncing ? "animate-spin" : ""
                                            }`}
                                        />
                                        {isSyncing ? "Syncing" : "Live"}
                                    </span>
                                </div>

                                <div className="better-scrollbar max-h-[21rem] divide-y divide-[var(--color-border)] overflow-y-auto px-6">
                                    {checkoutItems.map((item) => {
                                        const itemKey = getItemKey(
                                            item.productId,
                                            item.size,
                                            item.color
                                        );
                                        const isBusy = updatingKey === itemKey;
                                        const reachedStock =
                                            item.stock !== undefined &&
                                            item.quantity >= item.stock;

                                        return (
                                            <div
                                                key={itemKey}
                                                className={`flex gap-4 py-5 transition-opacity ${
                                                    isBusy
                                                        ? "pointer-events-none opacity-50"
                                                        : ""
                                                }`}
                                            >
                                                <Link
                                                    to={`/products/${item.productId}`}
                                                    className="shrink-0"
                                                >
                                                    <div className="h-24 w-20 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]">
                                                        {item.image ? (
                                                            <img
                                                                src={item.image}
                                                                alt={item.name}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="flex h-full w-full items-center justify-center text-[var(--color-ink-muted)]">
                                                                <ShoppingBag className="h-5 w-5" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </Link>

                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <Link
                                                                to={`/products/${item.productId}`}
                                                                className="block truncate text-sm font-semibold text-[var(--color-ink)] transition-colors hover:text-[var(--color-primary)]"
                                                            >
                                                                {item.name}
                                                            </Link>
                                                            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--color-ink-soft)]">
                                                                <span>
                                                                    Size{" "}
                                                                    <span className="font-medium text-[var(--color-ink)]">
                                                                        {
                                                                            item.size
                                                                        }
                                                                    </span>
                                                                </span>
                                                                <span className="text-[var(--color-border-strong)]">
                                                                    ·
                                                                </span>
                                                                <span className="inline-flex items-center gap-1.5">
                                                                    <span
                                                                        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-[var(--color-border-strong)]"
                                                                        style={getColorStyle(
                                                                            item.color
                                                                        )}
                                                                    />
                                                                    {item.color}
                                                                </span>
                                                            </p>
                                                            {!item.inStock ? (
                                                                <p className="mt-1 text-[11px] font-medium text-[var(--color-danger)]">
                                                                    Out of stock
                                                                </p>
                                                            ) : item.stock !==
                                                                  undefined &&
                                                              item.stock <= 5 ? (
                                                                <p className="mt-1 text-[11px] font-medium text-[var(--color-accent)]">
                                                                    Only{" "}
                                                                    {item.stock}{" "}
                                                                    left
                                                                </p>
                                                            ) : null}
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleRemoveItem(
                                                                    item
                                                                )
                                                            }
                                                            aria-label={`Remove ${item.name}`}
                                                            className="rounded-full p-1.5 text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-danger)]"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>

                                                    <div className="mt-3 flex items-center justify-between gap-3">
                                                        <div className="inline-flex items-center rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)]">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    void handleQuantityChange(
                                                                        item,
                                                                        item.quantity -
                                                                            1
                                                                    )
                                                                }
                                                                disabled={
                                                                    item.quantity <=
                                                                    1
                                                                }
                                                                aria-label="Decrease quantity"
                                                                className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-40"
                                                            >
                                                                <Minus className="h-3 w-3" />
                                                            </button>
                                                            <span className="w-6 text-center text-xs font-semibold text-[var(--color-ink)]">
                                                                {item.quantity}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    void handleQuantityChange(
                                                                        item,
                                                                        item.quantity +
                                                                            1
                                                                    )
                                                                }
                                                                disabled={
                                                                    reachedStock
                                                                }
                                                                aria-label="Increase quantity"
                                                                className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-40"
                                                            >
                                                                <Plus className="h-3 w-3" />
                                                            </button>
                                                        </div>

                                                        <div className="text-right">
                                                            <p className="text-sm font-semibold text-[var(--color-ink)]">
                                                                {`$${item.lineTotal.toFixed(
                                                                    2
                                                                )}`}
                                                            </p>
                                                            {item.quantity >
                                                                1 && (
                                                                <p className="text-[11px] text-[var(--color-ink-muted)]">
                                                                    {`$${item.price.toFixed(
                                                                        2
                                                                    )} each`}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Promo code */}
                                <div className="border-t border-[var(--color-border)] px-6 py-4">
                                    {appliedCode ? (
                                        <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-success)]/30 bg-[var(--color-primary-soft)] px-3.5 py-2.5 text-xs text-[var(--color-primary)]">
                                            <span className="inline-flex items-center gap-1.5">
                                                <Tag className="h-3.5 w-3.5" />
                                                <span>
                                                    <strong>{appliedCode}</strong>{" "}
                                                    applied (−$
                                                    {discount.toFixed(2)})
                                                </span>
                                            </span>
                                            <button
                                                type="button"
                                                onClick={handleRemovePromo}
                                                className="font-semibold underline underline-offset-2 transition-colors hover:text-[var(--color-danger)]"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <Tag className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-ink-muted)]" />
                                                <input
                                                    type="text"
                                                    value={promoCode}
                                                    onChange={(e) =>
                                                        setPromoCode(
                                                            e.target.value
                                                        )
                                                    }
                                                    onKeyDown={(e) => {
                                                        if (
                                                            e.key === "Enter"
                                                        ) {
                                                            e.preventDefault();
                                                            handleApplyPromo();
                                                        }
                                                    }}
                                                    placeholder="Discount code"
                                                    aria-label="Discount code"
                                                    className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] py-2.5 pl-9 pr-3 text-xs uppercase tracking-wide text-[var(--color-ink)] transition-all placeholder:normal-case placeholder:tracking-normal placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-soft)]"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleApplyPromo}
                                                className="rounded-xl border border-[var(--color-border-strong)] px-4 py-2.5 text-xs font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]"
                                            >
                                                Apply
                                            </button>
                                        </div>
                                    )}
                                    <p className="mt-2 text-[11px] text-[var(--color-ink-muted)]">
                                        Try <strong>CLASSY10</strong> or{" "}
                                        <strong>WELCOME15</strong>
                                    </p>
                                </div>

                                {/* Totals */}
                                <div className="space-y-2.5 border-t border-[var(--color-border)] px-6 py-5 text-sm">
                                    <div className="flex items-center justify-between text-[var(--color-ink-soft)]">
                                        <span>Subtotal</span>
                                        <span className="font-medium text-[var(--color-ink)]">
                                            ${subtotal.toFixed(2)}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between text-[var(--color-ink-soft)]">
                                        <span>
                                            Shipping ·{" "}
                                            {shippingMethod === "express"
                                                ? "Express"
                                                : "Standard"}
                                        </span>
                                        <span className="font-medium text-[var(--color-ink)]">
                                            {shippingCost === 0
                                                ? "Free"
                                                : `$${shippingCost.toFixed(2)}`}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between text-[var(--color-ink-soft)]">
                                        <span>Estimated tax (8%)</span>
                                        <span className="font-medium text-[var(--color-ink)]">
                                            ${tax.toFixed(2)}
                                        </span>
                                    </div>

                                    {savings > 0 && (
                                        <div className="flex items-center justify-between text-[var(--color-success)]">
                                            <span>Catalog savings</span>
                                            <span className="font-medium">
                                                −${savings.toFixed(2)}
                                            </span>
                                        </div>
                                    )}

                                    {discount > 0 && (
                                        <div className="flex items-center justify-between font-medium text-[var(--color-success)]">
                                            <span>Promo discount</span>
                                            <span>−${discount.toFixed(2)}</span>
                                        </div>
                                    )}

                                    <div className="flex items-end justify-between border-t border-[var(--color-border)] pt-4">
                                        <div>
                                            <span className="block text-base font-semibold text-[var(--color-ink)]">
                                                Total
                                            </span>
                                            <span className="text-[11px] text-[var(--color-ink-muted)]">
                                                Taxes and duties included
                                            </span>
                                        </div>
                                        <span className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
                                            ${total.toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                {/* Assurance */}
                                <div className="space-y-2 border-t border-[var(--color-border)] bg-[var(--color-surface-muted)]/40 px-6 py-4 text-xs text-[var(--color-ink-soft)]">
                                    <div className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-[var(--color-success)]" />
                                        <span>Free 30-day returns</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-[var(--color-success)]" />
                                        <span>Authentic pieces, brand warranty</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Truck className="h-4 w-4 text-[var(--color-success)]" />
                                        <span>Tracked worldwide delivery</span>
                                    </div>
                                </div>
                            </div>

                            <p className="mt-4 text-center text-[11px] leading-relaxed text-[var(--color-ink-muted)]">
                                Need a hand? Email{" "}
                                <a
                                    href="mailto:care@classyshop.com"
                                    className="font-medium text-[var(--color-ink-soft)] underline underline-offset-2 transition-colors hover:text-[var(--color-primary)]"
                                >
                                    care@classyshop.com
                                </a>
                            </p>
                        </aside>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Checkout;
