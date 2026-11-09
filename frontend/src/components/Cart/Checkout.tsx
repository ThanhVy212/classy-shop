import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    ArrowLeft,
    ArrowRight,
    Banknote,
    Check,
    CreditCard,
    Lock,
    MapPin,
    Minus,
    Plus,
    RefreshCcw,
    ShieldCheck,
    ShoppingBag,
    Star,
    Tag,
    Trash2,
    Truck,
    Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { useCart } from "../../hooks/useCart.ts";
import OptimizedImage from "../Common/OptimizedImage.tsx";
import { useAuth } from "../../hooks/useAuth.ts";
import { useSyncedCart } from "../../hooks/useSyncedCart.ts";
import type { SyncedCartLine } from "../../hooks/useSyncedCart.ts";
import {
    checkoutSchema,
    COUNTRIES,
    type CheckoutFormData,
} from "../../validations/checkout.ts";
import { getColorStyle } from "../../utils/colors.ts";
import { orderService } from "../../services/orderService.ts";
import { discountService } from "../../services/discountService.ts";
import { addressService } from "../../services/addressService.ts";
import type { ShippingAddress } from "../../types/auth.ts";
import type { PaymentMethod } from "../../types/order.ts";
import type { DiscountValidation } from "../../types/discount.ts";
import { calculateDiscountPreview } from "../../utils/discount.ts";
import { getApiErrorMessage } from "../../utils/apiError.ts";
import Button from "../Common/Button.tsx";
import { CheckoutSkeleton } from "../Common/Skeletons.tsx";

const getItemKey = (productId: string, size: string, color: string) =>
    `${productId}-${size}-${color}`;

const getCheckoutDefaults = (name?: string, email?: string): CheckoutFormData => {
    const nameParts = (name || "").trim().split(/\s+/).filter(Boolean);

    return {
        email: email || "",
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
        shippingMethod: "standard",
    };
};

const splitFullName = (fullName: string) => {
    const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);

    return {
        firstName: parts[0] || "",
        lastName: parts.slice(1).join(" "),
    };
};

const isSameAddress = (
    saved: ShippingAddress,
    next: {
        fullName: string;
        phone: string;
        address: string;
        apartment: string;
        city: string;
        postalCode: string;
        country: string;
    }
) => {
    const fields = [
        "fullName",
        "phone",
        "address",
        "apartment",
        "city",
        "postalCode",
        "country",
    ] as const;

    return fields.every(
        (field) =>
            (saved[field] || "").trim().toLowerCase() ===
            (next[field] || "").trim().toLowerCase()
    );
};

const Checkout = () => {
    const navigate = useNavigate();
    const {
        cart,
        refreshCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        isLoading: cartLoading,
    } = useCart();
    const { isAuthenticated, isLoading: authLoading, user, setUser } =
        useAuth();

    const {
        register,
        control,
        handleSubmit,
        getValues,
        setValue,
        formState: { errors },
    } = useForm<CheckoutFormData>({
        resolver: zodResolver(checkoutSchema),
        mode: "onTouched",
        defaultValues: getCheckoutDefaults(user?.name, user?.email),
    });

    const shippingMethod = useWatch({ control, name: "shippingMethod" });
    const saveInfo = useWatch({ control, name: "saveInfo" });

    const [promoCode, setPromoCode] = useState("");
    const [appliedDiscount, setAppliedDiscount] =
        useState<DiscountValidation | null>(null);
    const [isApplyingPromo, setIsApplyingPromo] = useState(false);
    const [updatingKey, setUpdatingKey] = useState<string | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("COD");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [addresses, setAddresses] = useState<ShippingAddress[]>(
        () => user?.addresses ?? []
    );
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
        null
    );
    const [saveAsDefault, setSaveAsDefault] = useState(false);
    const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);

    const hasRequestedCart = useRef(false);
    const hasAppliedDefaultAddress = useRef(false);
    // Mirrors selectedAddressId so async callbacks can read the latest
    // selection instead of the value captured when the request started.
    const selectedAddressIdRef = useRef<string | null>(null);

    const updateSelectedAddressId = (addressId: string | null) => {
        selectedAddressIdRef.current = addressId;
        setSelectedAddressId(addressId);
    };

    const applyAddressToForm = (address: ShippingAddress) => {
        const { firstName, lastName } = splitFullName(address.fullName);

        setValue("firstName", firstName);
        setValue("lastName", lastName);
        setValue("address", address.address || "");
        setValue("apartment", address.apartment || "");
        setValue("city", address.city || "");
        setValue("postalCode", address.postalCode || "");
        setValue("phone", address.phone || "");
        setValue(
            "country",
            (COUNTRIES as readonly string[]).includes(address.country)
                ? (address.country as CheckoutFormData["country"])
                : "United States"
        );
    };

    const handleSelectAddress = (address: ShippingAddress) => {
        updateSelectedAddressId(address._id);
        setSaveAsDefault(address.isDefault);
        applyAddressToForm(address);
    };

    const handleUseNewAddress = () => {
        updateSelectedAddressId(null);
        setSaveAsDefault(addresses.length === 0);
        setValue("address", "");
        setValue("apartment", "");
        setValue("city", "");
        setValue("postalCode", "");
        setValue("phone", "");
    };

    const handleSetDefaultAddress = async (address: ShippingAddress) => {
        try {
            const updated = await addressService.setDefaultAddress(address._id);

            setAddresses(updated);
            setUser((current) =>
                current ? { ...current, addresses: updated } : current
            );

            const matched = updated.find(
                (a) => a._id === selectedAddressIdRef.current
            );
            setSaveAsDefault(matched ? matched.isDefault : false);

            toast.success("Default delivery address updated");
        } catch (error) {
            toast.error(
                getApiErrorMessage(
                    error,
                    "Could not update your default address."
                )
            );
        }
    };

    const persistAddress = async (data: CheckoutFormData) => {
        if (!data.saveInfo) return;

        const payload = {
            fullName: `${data.firstName} ${data.lastName}`.trim(),
            phone: data.phone,
            address: data.address,
            apartment: data.apartment,
            city: data.city,
            postalCode: data.postalCode,
            country: data.country,
        };

        try {
            const existing = addresses.find((address) =>
                isSameAddress(address, payload)
            );

            if (existing) {
                if (saveAsDefault && !existing.isDefault) {
                    const updated = await addressService.setDefaultAddress(
                        existing._id
                    );

                    setAddresses(updated);
                    setUser((current) =>
                        current ? { ...current, addresses: updated } : current
                    );
                }
                return;
            }

            const updated = await addressService.createAddress({
                ...payload,
                isDefault: saveAsDefault || addresses.length === 0,
            });

            setAddresses(updated);
            setUser((current) =>
                current ? { ...current, addresses: updated } : current
            );
        } catch (error) {
            // The order is already placed at this point; a failed address save
            // must never make the checkout look unsuccessful.
            console.warn("Could not save the delivery address:", error);
        }
    };

    // Make sure the bag is re-fetched from the cart API when checkout opens.
    useEffect(() => {
        if (!isAuthenticated || hasRequestedCart.current) return;
        hasRequestedCart.current = true;
        void refreshCart();
    }, [isAuthenticated, refreshCart]);

    // Load the address book from the API so it stays in sync across devices.
    useEffect(() => {
        if (!isAuthenticated) return;

        let isMounted = true;
        setIsLoadingAddresses(true);

        void addressService
            .getAddresses()
            .then((list) => {
                if (!isMounted) return;
                setAddresses(list);
                setUser((current) =>
                    current ? { ...current, addresses: list } : current
                );
            })
            .catch(() => {
                // Keep the addresses already embedded in the auth profile.
            })
            .finally(() => {
                if (isMounted) setIsLoadingAddresses(false);
            });

        return () => {
            isMounted = false;
        };
    }, [isAuthenticated, setUser]);

    // Prefill the form with the default address the first time the book loads.
    useEffect(() => {
        if (hasAppliedDefaultAddress.current || addresses.length === 0) return;

        hasAppliedDefaultAddress.current = true;

        const preferred =
            addresses.find((address) => address.isDefault) ?? addresses[0];

        updateSelectedAddressId(preferred._id);
        setSaveAsDefault(preferred.isDefault);
        applyAddressToForm(preferred);
        // Only run when the saved addresses first arrive.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [addresses]);

    useEffect(() => {
        if (!user) return;

        const nameParts = (user.name || "").trim().split(/\s+/).filter(Boolean);
        if (!getValues("email")) setValue("email", user.email || "");
        if (!getValues("firstName")) setValue("firstName", nameParts[0] || "");
        if (!getValues("lastName")) {
            setValue("lastName", nameParts.slice(1).join(" "));
        }
    }, [user, getValues, setValue]);

    // Live cart lines: latest name, image, price and stock from the product API.
    const {
        items: checkoutItems,
        subtotal,
        savings,
        itemCount,
        isSyncing,
    } = useSyncedCart();

    const shippingCost = shippingMethod === "express" ? 15 : 0;
    const discount = calculateDiscountPreview(appliedDiscount, subtotal);
    const tax = Math.round(subtotal * 0.08 * 100) / 100;
    const total = Math.max(0, subtotal + shippingCost + tax - discount);

    const handleApplyPromo = async () => {
        const code = promoCode.trim().toUpperCase();
        if (!code || isApplyingPromo) return;

        setIsApplyingPromo(true);

        try {
            const result = await discountService.validate(code, subtotal);

            setAppliedDiscount(result);
            setPromoCode("");
            toast.success(
                `${result.code} applied — $${result.discountAmount.toFixed(2)} off`
            );
        } catch (error) {
            toast.error(
                getApiErrorMessage(error, "That discount code isn't valid.")
            );
        } finally {
            setIsApplyingPromo(false);
        }
    };

    const handleRemovePromo = () => {
        setAppliedDiscount(null);
        toast.info("Discount code removed");
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
       ORDER CREATION
       Cash on delivery is the only enabled payment method for now. The
       backend recomputes every price, discount and tax value from the
       product catalog before creating the order.
       ==================================================================== */
    const onSubmit = async (data: CheckoutFormData) => {
        if (isSubmitting) return;

        const unavailableItem = checkoutItems.find((item) => !item.inStock);
        if (unavailableItem) {
            toast.error(`${unavailableItem.name} is out of stock`, {
                description: "Remove it from your bag to continue.",
            });
            return;
        }

        setIsSubmitting(true);

        try {
            const order = await orderService.createOrder({
                contactEmail: data.email,
                shippingAddress: {
                    fullName: `${data.firstName} ${data.lastName}`.trim(),
                    phone: data.phone,
                    address: data.address,
                    apartment: data.apartment,
                    city: data.city,
                    postalCode: data.postalCode,
                    country: data.country,
                },
                shippingMethod: data.shippingMethod,
                paymentMethod,
                promoCode: appliedDiscount?.code ?? null,
            });

            await persistAddress(data);

            clearCart();
            void refreshCart();

            toast.success("Order placed successfully", {
                description: `Order ${order.orderNumber} is confirmed. You'll pay in cash when it arrives.`,
            });

            navigate(`/order/${order._id}`, {
                state: { justPlaced: true },
            });
        } catch (error) {
            toast.error(
                getApiErrorMessage(
                    error,
                    "Could not place your order. Please try again."
                )
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    if (authLoading || (!cart && cartLoading)) {
        return <CheckoutSkeleton />;
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

                <form
                    onSubmit={handleSubmit(onSubmit)}
                    noValidate
                    className="mt-8 sm:mt-10"
                >
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
                                            {...register("email")}
                                            autoComplete="email"
                                            placeholder="you@example.com"
                                            className={`form-input ${
                                                errors.email
                                                    ? "border-red-500 focus:ring-red-500"
                                                    : ""
                                            }`}
                                            aria-invalid={
                                                errors.email ? "true" : "false"
                                            }
                                        />
                                        {errors.email && (
                                            <p className="mt-1.5 text-xs font-medium text-red-500">
                                                {errors.email.message}
                                            </p>
                                        )}
                                    </div>

                                    <label className="flex cursor-pointer items-start gap-3 text-sm text-[var(--color-ink-soft)]">
                                        <input
                                            type="checkbox"
                                            {...register("newsletter")}
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

                                {isLoadingAddresses && addresses.length === 0 ? (
                                    <div className="mt-5 flex items-center gap-2 text-xs text-[var(--color-ink-muted)]">
                                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]" />
                                        Loading saved addresses…
                                    </div>
                                ) : addresses.length > 0 ? (
                                    <div className="mt-5">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--color-ink-muted)]">
                                                Saved addresses
                                            </p>
                                            <Button
                                                type="button"
                                                onClick={handleUseNewAddress}
                                                className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-hover)]"
                                            >
                                                <Plus className="h-3.5 w-3.5" />
                                                Use a new address
                                            </Button>
                                        </div>

                                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                            {addresses.map((address) => {
                                                const isActive =
                                                    selectedAddressId ===
                                                    address._id;

                                                return (
                                                    <div
                                                        key={address._id}
                                                        role="button"
                                                        tabIndex={0}
                                                        onClick={() =>
                                                            handleSelectAddress(
                                                                address
                                                            )
                                                        }
                                                        onKeyDown={(event) => {
                                                            if (
                                                                event.target ===
                                                                    event.currentTarget &&
                                                                (event.key ===
                                                                    "Enter" ||
                                                                event.key === " ")
                                                            ) {
                                                                event.preventDefault();
                                                                handleSelectAddress(
                                                                    address
                                                                );
                                                            }
                                                        }}
                                                        aria-pressed={isActive}
                                                        className={`relative cursor-pointer rounded-2xl border p-4 pr-5 text-left transition-all ${
                                                            isActive
                                                                ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]/50 ring-1 ring-[var(--color-primary)]"
                                                                : "border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-muted)]/40"
                                                        }`}
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <span className="inline-flex min-w-0 items-center gap-1.5 text-sm font-semibold text-[var(--color-ink)]">
                                                                <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" />
                                                                <span className="truncate">
                                                                    {
                                                                        address.fullName
                                                                    }
                                                                </span>
                                                            </span>
                                                            {address.isDefault ? (
                                                                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--color-primary)]">
                                                                    <Star className="h-2.5 w-2.5 fill-current" />
                                                                    Default
                                                                </span>
                                                            ) : (
                                                                <Button
                                                                    type="button"
                                                                    onClick={(
                                                                        event
                                                                    ) => {
                                                                        event.stopPropagation();
                                                                        void handleSetDefaultAddress(
                                                                            address
                                                                        );
                                                                    }}
                                                                    className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-primary)]"
                                                                >
                                                                    Set default
                                                                </Button>
                                                            )}
                                                        </div>

                                                        <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-ink-soft)]">
                                                            {address.address}
                                                            {address.apartment
                                                                ? `, ${address.apartment}`
                                                                : ""}
                                                            <br />
                                                            {address.city},{" "}
                                                            {address.postalCode}
                                                            <br />
                                                            {address.country}
                                                        </p>
                                                        <p className="mt-1.5 text-xs text-[var(--color-ink-muted)]">
                                                            {address.phone}
                                                        </p>

                                                        {isActive && (
                                                            <span className="absolute bottom-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary)] text-white">
                                                                <Check className="h-3 w-3" />
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : null}

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
                                            {...register("country")}
                                            className={`form-select ${
                                                errors.country
                                                    ? "border-red-500 focus:ring-red-500"
                                                    : ""
                                            }`}
                                            aria-invalid={
                                                errors.country ? "true" : "false"
                                            }
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
                                        {errors.country && (
                                            <p className="mt-1.5 text-xs font-medium text-red-500">
                                                {errors.country.message}
                                            </p>
                                        )}
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
                                                {...register("firstName")}
                                                autoComplete="given-name"
                                                placeholder="First name"
                                                className={`form-input ${
                                                    errors.firstName
                                                        ? "border-red-500 focus:ring-red-500"
                                                        : ""
                                                }`}
                                                aria-invalid={
                                                    errors.firstName
                                                        ? "true"
                                                        : "false"
                                                }
                                            />
                                            {errors.firstName && (
                                                <p className="mt-1.5 text-xs font-medium text-red-500">
                                                    {errors.firstName.message}
                                                </p>
                                            )}
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
                                                {...register("lastName")}
                                                autoComplete="family-name"
                                                placeholder="Last name"
                                                className={`form-input ${
                                                    errors.lastName
                                                        ? "border-red-500 focus:ring-red-500"
                                                        : ""
                                                }`}
                                                aria-invalid={
                                                    errors.lastName
                                                        ? "true"
                                                        : "false"
                                                }
                                            />
                                            {errors.lastName && (
                                                <p className="mt-1.5 text-xs font-medium text-red-500">
                                                    {errors.lastName.message}
                                                </p>
                                            )}
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
                                            {...register("address")}
                                            autoComplete="street-address"
                                            placeholder="Street and house number"
                                            className={`form-input ${
                                                errors.address
                                                    ? "border-red-500 focus:ring-red-500"
                                                    : ""
                                            }`}
                                            aria-invalid={
                                                errors.address ? "true" : "false"
                                            }
                                        />
                                        {errors.address && (
                                            <p className="mt-1.5 text-xs font-medium text-red-500">
                                                {errors.address.message}
                                            </p>
                                        )}
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
                                            {...register("apartment")}
                                            autoComplete="address-line2"
                                            placeholder="Apt, floor, building"
                                            className={`form-input ${
                                                errors.apartment
                                                    ? "border-red-500 focus:ring-red-500"
                                                    : ""
                                            }`}
                                            aria-invalid={
                                                errors.apartment
                                                    ? "true"
                                                    : "false"
                                            }
                                        />
                                        {errors.apartment && (
                                            <p className="mt-1.5 text-xs font-medium text-red-500">
                                                {errors.apartment.message}
                                            </p>
                                        )}
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
                                                {...register("city")}
                                                autoComplete="address-level2"
                                                placeholder="City"
                                                className={`form-input ${
                                                    errors.city
                                                        ? "border-red-500 focus:ring-red-500"
                                                        : ""
                                                }`}
                                                aria-invalid={
                                                    errors.city
                                                        ? "true"
                                                        : "false"
                                                }
                                            />
                                            {errors.city && (
                                                <p className="mt-1.5 text-xs font-medium text-red-500">
                                                    {errors.city.message}
                                                </p>
                                            )}
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
                                                {...register("postalCode")}
                                                autoComplete="postal-code"
                                                placeholder="Postal code"
                                                className={`form-input ${
                                                    errors.postalCode
                                                        ? "border-red-500 focus:ring-red-500"
                                                        : ""
                                                }`}
                                                aria-invalid={
                                                    errors.postalCode
                                                        ? "true"
                                                        : "false"
                                                }
                                            />
                                            {errors.postalCode && (
                                                <p className="mt-1.5 text-xs font-medium text-red-500">
                                                    {errors.postalCode.message}
                                                </p>
                                            )}
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
                                            {...register("phone")}
                                            autoComplete="tel"
                                            placeholder="For delivery updates"
                                            className={`form-input ${
                                                errors.phone
                                                    ? "border-red-500 focus:ring-red-500"
                                                    : ""
                                            }`}
                                            aria-invalid={
                                                errors.phone ? "true" : "false"
                                            }
                                        />
                                        {errors.phone && (
                                            <p className="mt-1.5 text-xs font-medium text-red-500">
                                                {errors.phone.message}
                                            </p>
                                        )}
                                    </div>

                                    <label className="flex cursor-pointer items-start gap-3 text-sm text-[var(--color-ink-soft)]">
                                        <input
                                            type="checkbox"
                                            {...register("saveInfo")}
                                            className="form-checkbox mt-0.5"
                                        />
                                        <span>
                                            Save this information for a faster
                                            checkout next time.
                                        </span>
                                    </label>

                                    {saveInfo && (
                                        <label className="flex cursor-pointer items-start gap-3 text-sm text-[var(--color-ink-soft)]">
                                            <input
                                                type="checkbox"
                                                checked={saveAsDefault}
                                                onChange={(event) =>
                                                    setSaveAsDefault(
                                                        event.target.checked
                                                    )
                                                }
                                                className="form-checkbox mt-0.5"
                                            />
                                            <span>
                                                Set this as my default delivery
                                                address.
                                            </span>
                                        </label>
                                    )}
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
                                                value="standard"
                                                {...register("shippingMethod")}
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
                                                value="express"
                                                {...register("shippingMethod")}
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

                            {/* Payment */}
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
                                    <span className="rounded-full border border-[var(--color-success)]/30 bg-[var(--color-primary-soft)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-primary)]">
                                        Cash on delivery
                                    </span>
                                </div>

                                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                                    <label className="flex cursor-pointer flex-col gap-2 rounded-2xl border border-[var(--color-primary)] bg-[var(--color-primary-soft)]/50 p-4 ring-1 ring-[var(--color-primary)]">
                                        <span className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="paymentMethod"
                                                value="COD"
                                                checked={paymentMethod === "COD"}
                                                onChange={() =>
                                                    setPaymentMethod("COD")
                                                }
                                                className="form-radio"
                                            />
                                            <Banknote className="h-4 w-4 text-[var(--color-primary)]" />
                                            <span className="text-sm font-semibold text-[var(--color-ink)]">
                                                Cash on delivery
                                            </span>
                                        </span>
                                        <span className="text-xs leading-relaxed text-[var(--color-ink-soft)]">
                                            Pay in cash when your order
                                            arrives. Available now.
                                        </span>
                                    </label>

                                    {[
                                        {
                                            label: "Credit / debit card",
                                            icon: CreditCard,
                                        },
                                        { label: "PayPal", icon: Wallet },
                                    ].map(({ label, icon: Icon }) => (
                                        <div
                                            key={label}
                                            className="flex flex-col gap-2 rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-muted)]/40 p-4"
                                        >
                                            <span className="flex items-center gap-2">
                                                <Icon className="h-4 w-4 shrink-0 text-[var(--color-ink-muted)]" />
                                                <span className="text-sm font-medium text-[var(--color-ink-soft)]">
                                                    {label}
                                                </span>
                                            </span>
                                            <span className="text-xs text-[var(--color-ink-muted)]">
                                                Coming soon
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-[var(--color-primary-soft)] px-4 py-3 text-xs leading-relaxed text-[var(--color-primary)]">
                                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                                    <p>
                                        Your order is created immediately and
                                        reserved from stock. Payment is
                                        collected in cash by the courier when
                                        your order is delivered — no card
                                        details are needed.
                                    </p>
                                </div>
                            </section>

                            <div className="space-y-3 pt-1">
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="checkout-primary-button group disabled:opacity-70"
                                >
                                    <Lock className="h-4 w-4" />
                                    <span>
                                        {isSubmitting
                                            ? "Placing your order…"
                                            : `Place order · $${total.toFixed(2)}`}
                                    </span>
                                    {!isSubmitting && (
                                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                                    )}
                                </Button>

                                <p className="text-center text-[11px] leading-relaxed text-[var(--color-ink-muted)]">
                                    By placing your order you agree to pay in
                                    cash on delivery. You can cancel while the
                                    order is still processing.
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
                                                            <OptimizedImage
                                                                src={item.image}
                                                                alt={item.name}
                                                                widths={[80, 120, 160]}
                                                                sizes="80px"
                                                                crop="fill"
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
                                    {appliedDiscount ? (
                                        <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-success)]/30 bg-[var(--color-primary-soft)] px-3.5 py-2.5 text-xs text-[var(--color-primary)]">
                                            <span className="inline-flex items-center gap-1.5">
                                                <Tag className="h-3.5 w-3.5" />
                                                <span>
                                                    <strong>
                                                        {appliedDiscount.code}
                                                    </strong>{" "}
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
                                                            void handleApplyPromo();
                                                        }
                                                    }}
                                                    placeholder="Discount code"
                                                    aria-label="Discount code"
                                                    className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] py-2.5 pl-9 pr-3 text-xs uppercase tracking-wide text-[var(--color-ink)] transition-all placeholder:normal-case placeholder:tracking-normal placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-soft)]"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => void handleApplyPromo()}
                                                disabled={isApplyingPromo}
                                                className="rounded-xl border border-[var(--color-border-strong)] px-4 py-2.5 text-xs font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)] disabled:cursor-wait disabled:opacity-60"
                                            >
                                                {isApplyingPromo
                                                    ? "Applying…"
                                                    : "Apply"}
                                            </button>
                                        </div>
                                    )}
                                    <p className="mt-2 text-[11px] text-[var(--color-ink-muted)]">
                                        Enter a valid discount code. One code
                                        per order.
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
