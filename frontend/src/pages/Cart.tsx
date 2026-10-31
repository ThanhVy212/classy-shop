import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Lock,
  Minus,
  Plus,
  RefreshCcw,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../hooks/useAuth.ts";
import { useCart } from "../hooks/useCart.ts";
import { useSyncedCart } from "../hooks/useSyncedCart.ts";
import type { SyncedCartLine } from "../hooks/useSyncedCart.ts";
import { getColorStyle } from "../utils/colors.ts";
import Button from "../components/Common/Button.tsx";

const getItemKey = (productId: string, size: string, color: string) =>
  `${productId}-${size}-${color}`;

const Cart = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const {
    cart,
    refreshCart,
    updateQuantity,
    removeFromCart,
    isLoading: cartLoading,
  } = useCart();
  const { items, subtotal, savings, itemCount, isSyncing } = useSyncedCart();

  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const hasRequestedCart = useRef(false);

  useEffect(() => {
    if (authLoading || hasRequestedCart.current) return;
    hasRequestedCart.current = true;
    void refreshCart();
  }, [authLoading, refreshCart]);

  const handleQuantityChange = async (item: SyncedCartLine, next: number) => {
    if (next < 1) return;

    if (item.stock !== undefined && next > item.stock) {
      toast.error(`Only ${item.stock} left in stock.`);
      return;
    }

    const key = getItemKey(item.productId, item.size, item.color);
    setUpdatingKey(key);

    try {
      await updateQuantity(item.productId, item.size, item.color, next);
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

  const handleCheckout = () => {
    const unavailable = items.find((item) => !item.inStock);
    if (unavailable) {
      toast.error(`${unavailable.name} is out of stock`, {
        description: "Remove it from your bag to continue.",
      });
      return;
    }

    if (!isAuthenticated) {
      toast.info("Please log in to proceed to checkout", { duration: 2500 });
      navigate("/login?redirect=checkout", {
        state: { from: { pathname: "/checkout" } },
      });
      return;
    }

    navigate("/checkout");
  };

  if (authLoading || (!cart && cartLoading)) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[var(--color-canvas)]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]" />
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-ink-muted)]">
            Loading your bag
          </p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
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
            Discover new arrivals and timeless essentials — the pieces you add
            will appear here.
          </p>
          <Link
            to="/collections/all"
            className="checkout-primary-button mt-8 max-w-xs"
          >
            Start shopping
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

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--color-ink-muted)]">
              Shopping bag
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-4xl">
              Your bag
            </h1>
            <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
              {itemCount} {itemCount === 1 ? "piece" : "pieces"} selected —
              review them before checkout.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              title="Prices and stock are synced from the product catalog"
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface-muted)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-soft)]"
            >
              <RefreshCcw
                className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`}
              />
              {isSyncing ? "Syncing" : "Live prices"}
            </span>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-10">
          {/* ================= CART ITEMS ================= */}
          <div className="space-y-6 lg:col-span-7">
            <div className="checkout-card overflow-hidden">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
                <h2 className="text-sm font-semibold text-[var(--color-ink)]">
                  Items
                </h2>
                <span className="text-xs text-[var(--color-ink-soft)]">
                  {itemCount} {itemCount === 1 ? "item" : "items"}
                </span>
              </div>

              <div className="divide-y divide-[var(--color-border)] px-6">
                {items.map((item) => {
                  const itemKey = getItemKey(
                    item.productId,
                    item.size,
                    item.color
                  );
                  const isBusy = updatingKey === itemKey;
                  const reachedStock =
                    item.stock !== undefined && item.quantity >= item.stock;

                  return (
                    <div
                      key={itemKey}
                      className={`flex gap-4 py-6 transition-opacity sm:gap-5 ${
                        isBusy ? "pointer-events-none opacity-50" : ""
                      }`}
                    >
                      <Link
                        to={`/products/${item.productId}`}
                        className="shrink-0"
                      >
                        <div className="h-32 w-24 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] sm:h-36 sm:w-28">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[var(--color-ink-muted)]">
                              <ShoppingBag className="h-6 w-6" />
                            </div>
                          )}
                        </div>
                      </Link>

                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <Link
                              to={`/products/${item.productId}`}
                              className="block truncate text-sm font-semibold text-[var(--color-ink)] transition-colors hover:text-[var(--color-primary)] sm:text-base"
                            >
                              {item.name}
                            </Link>
                            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--color-ink-soft)]">
                              <span>
                                Size{" "}
                                <span className="font-medium text-[var(--color-ink)]">
                                  {item.size}
                                </span>
                              </span>
                              <span className="text-[var(--color-border-strong)]">
                                ·
                              </span>
                              <span className="inline-flex items-center gap-1.5">
                                <span
                                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-[var(--color-border-strong)]"
                                  style={getColorStyle(item.color)}
                                />
                                {item.color}
                              </span>
                            </p>

                            {!item.inStock ? (
                              <p className="mt-2 text-[11px] font-medium text-[var(--color-danger)]">
                                Out of stock — remove to continue
                              </p>
                            ) : item.stock !== undefined &&
                              item.stock <= 5 ? (
                              <p className="mt-2 text-[11px] font-medium text-[var(--color-accent)]">
                                Only {item.stock} left in stock
                              </p>
                            ) : (
                              <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-[var(--color-success)]">
                                <Check className="h-3.5 w-3.5" />
                                In stock, ready to ship
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item)}
                            aria-label={`Remove ${item.name}`}
                            className="rounded-full p-1.5 text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-danger)]"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-5">
                          <div className="inline-flex items-center rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)]">
                            <button
                              type="button"
                              onClick={() =>
                                void handleQuantityChange(
                                  item,
                                  item.quantity - 1
                                )
                              }
                              disabled={item.quantity <= 1}
                              aria-label="Decrease quantity"
                              className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-7 text-center text-xs font-semibold text-[var(--color-ink)]">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                void handleQuantityChange(
                                  item,
                                  item.quantity + 1
                                )
                              }
                              disabled={reachedStock}
                              aria-label="Increase quantity"
                              className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          <div className="text-right">
                            <p className="text-base font-semibold text-[var(--color-ink)]">
                              ${item.lineTotal.toFixed(2)}
                            </p>
                            {item.quantity > 1 && (
                              <p className="text-[11px] text-[var(--color-ink-muted)]">
                                ${item.price.toFixed(2)} each
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 px-5 py-4 text-xs text-[var(--color-ink-soft)] sm:flex-row sm:items-center sm:justify-between">
              <span className="inline-flex items-center gap-2">
                <Truck className="h-4 w-4 text-[var(--color-success)]" />
                Complimentary standard shipping on every order
              </span>
              <span className="inline-flex items-center gap-2">
                <RefreshCcw className="h-4 w-4 text-[var(--color-success)]" />
                Free 30-day returns
              </span>
            </div>
          </div>

          {/* ================= SUMMARY ================= */}
          <aside className="lg:col-span-5">
            <div className="checkout-card overflow-hidden lg:sticky lg:top-24">
              <div className="flex items-center gap-2.5 border-b border-[var(--color-border)] p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                  <ShoppingBag className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-[var(--color-ink)]">
                    Order summary
                  </h2>
                  <p className="text-xs text-[var(--color-ink-soft)]">
                    {itemCount} {itemCount === 1 ? "item" : "items"}
                  </p>
                </div>
              </div>

              <div className="space-y-3 p-6 text-sm">
                <div className="flex items-center justify-between text-[var(--color-ink-soft)]">
                  <span>Subtotal</span>
                  <span className="font-medium text-[var(--color-ink)]">
                    ${subtotal.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[var(--color-ink-soft)]">
                  <span>Shipping</span>
                  <span className="font-medium text-[var(--color-success)]">
                    Free standard
                  </span>
                </div>

                <div className="flex items-center justify-between text-[var(--color-ink-soft)]">
                  <span>Tax</span>
                  <span className="text-xs text-[var(--color-ink-muted)]">
                    Calculated at checkout
                  </span>
                </div>

                {savings > 0 && (
                  <div className="flex items-center justify-between font-medium text-[var(--color-success)]">
                    <span>Catalog savings</span>
                    <span>−${savings.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex items-end justify-between border-t border-[var(--color-border)] pt-4">
                  <div>
                    <span className="block text-base font-semibold text-[var(--color-ink)]">
                      Estimated total
                    </span>
                    <span className="text-[11px] text-[var(--color-ink-muted)]">
                      Before taxes and discounts
                    </span>
                  </div>
                  <span className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
                    ${subtotal.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="px-6 pb-6">
                <Button
                  type="button"
                  onClick={handleCheckout}
                  className="checkout-primary-button group"
                >
                  <Lock className="h-4 w-4" />
                  Proceed to checkout
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>

                <Link
                  to="/collections/all"
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--color-border-strong)] px-5 py-3.5 text-sm font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]"
                >
                  Continue shopping
                </Link>

                <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-[var(--color-ink-muted)]">
                  <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-success)]" />
                  Secure checkout · 256-bit SSL
                </p>
              </div>

              <div className="space-y-2 border-t border-[var(--color-border)] bg-[var(--color-surface-muted)]/40 px-6 py-4 text-xs text-[var(--color-ink-soft)]">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[var(--color-success)]" />
                  <span>Live prices synced from the catalog</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[var(--color-success)]" />
                  <span>Authentic pieces with brand warranty</span>
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
      </div>
    </div>
  );
};

export default Cart;
