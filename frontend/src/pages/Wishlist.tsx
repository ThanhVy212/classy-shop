import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Heart, ImageOff, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Button from "../components/Common/Button.tsx";
import OptimizedImage from "../components/Common/OptimizedImage.tsx";
import { useWishlist } from "../hooks/useWishlist.ts";
import { getApiErrorMessage } from "../utils/apiError.ts";

const WishlistSkeleton = () => (
  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    {Array.from({ length: 4 }).map((_, index) => (
      <div
        key={index}
        className="animate-pulse overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"
      >
        <div className="aspect-[3/4] bg-[var(--color-surface-muted)]" />
        <div className="space-y-2 p-4">
          <div className="h-3 w-3/4 rounded-full bg-[var(--color-surface-muted)]" />
          <div className="h-3 w-1/3 rounded-full bg-[var(--color-surface-muted)]" />
        </div>
      </div>
    ))}
  </div>
);

const Wishlist = () => {
  const { items, isLoading, removeFromWishlist, clearWishlist } =
    useWishlist();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  const handleRemove = async (productId: string, name: string) => {
    if (items.length <= 1) setIsConfirmingClear(false);
    setRemovingId(productId);

    try {
      await removeFromWishlist(productId);
      toast.success(`${name} removed from your wishlist`);
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, "Could not remove this product."),
      );
    } finally {
      setRemovingId(null);
    }
  };

  const handleClear = async () => {
    setIsClearing(true);

    try {
      await clearWishlist();
      setIsConfirmingClear(false);
      toast.success("Wishlist cleared");
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, "Could not clear your wishlist."),
      );
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] pb-16 pt-8 sm:pt-10">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-8 sm:px-8 sm:py-10">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[var(--color-accent-soft)] blur-3xl" />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--color-ink-muted)]">
                Saved for later
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-4xl">
                My wishlist
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--color-ink-soft)]">
                {items.length > 0
                  ? `${items.length} piece${items.length === 1 ? "" : "s"} you are keeping an eye on.`
                  : "Tap the heart on any product to keep it here for later."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {items.length > 0 && !isConfirmingClear && (
                <button
                  type="button"
                  onClick={() => setIsConfirmingClear(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border-strong)] px-3.5 py-2 text-xs font-semibold text-[var(--color-ink-soft)] transition-colors hover:border-[var(--color-danger)] hover:text-[var(--color-danger)]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear wishlist
                </button>
              )}

              {items.length > 0 && isConfirmingClear && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--color-danger)]/30 bg-red-50/70 px-3 py-2">
                  <span className="text-xs font-semibold text-[var(--color-danger)]">
                    Clear all?
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleClear()}
                    disabled={isClearing}
                    className="rounded-lg bg-[var(--color-danger)] px-2.5 py-1 text-[11px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {isClearing ? "Clearing…" : "Yes, clear"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConfirmingClear(false)}
                    disabled={isClearing}
                    className="rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              )}

              <Link
                to="/collections/all"
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-primary)]"
              >
                Continue shopping
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8">
          {isLoading ? (
            <WishlistSkeleton />
          ) : items.length === 0 ? (
            <div className="card-padded flex flex-col items-center px-6 py-16 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                <Heart className="h-7 w-7" />
              </span>
              <h2 className="mt-5 text-lg font-semibold text-[var(--color-ink)]">
                Your wishlist is empty
              </h2>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--color-ink-soft)]">
                Save the pieces you love and come back when you are ready to
                complete the look.
              </p>
              <Link
                to="/collections/all"
                className="checkout-primary-button mx-auto mt-6 max-w-xs"
              >
                <ShoppingBag className="h-4 w-4" />
                Browse the collection
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map(({ productId, product }) => {
                const imageUrl = product.images?.[0]?.url || product.image;
                const price = Number(
                  product.discountPrice &&
                    product.discountPrice > 0 &&
                    product.discountPrice < product.price
                    ? product.discountPrice
                    : product.price,
                );
                const isOutOfStock = Number(product.countInStock) <= 0;
                const isUnavailable = product.isPublished === false;
                const isRemoving = removingId === productId;

                return (
                  <article
                    key={productId}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs"
                  >
                    <div className="relative aspect-[3/4] overflow-hidden bg-[var(--color-surface-muted)]">
                      <Link to={`/products/${productId}`} className="block h-full w-full">
                        {imageUrl ? (
                          <OptimizedImage
                            src={imageUrl}
                            alt={product.name}
                            widths={[240, 320, 480, 640, 800]}
                            sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                            crop="fill"
                            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                            loading="lazy"
                          />
                        ) : (
                          <span className="flex h-full w-full flex-col items-center justify-center gap-2 text-[var(--color-ink-muted)]">
                            <ImageOff className="h-7 w-7" />
                            <span className="text-[11px] font-medium uppercase tracking-[0.18em]">
                              No image
                            </span>
                          </span>
                        )}
                      </Link>

                      {(isOutOfStock || isUnavailable) && (
                        <span className="absolute left-2.5 top-2.5 rounded-full bg-[var(--color-ink)]/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
                          {isUnavailable ? "Unavailable" : "Out of stock"}
                        </span>
                      )}

                      <Button
                        type="button"
                        onClick={() => void handleRemove(productId, product.name)}
                        disabled={isRemoving}
                        aria-label={`Remove ${product.name} from wishlist`}
                        title="Remove from wishlist"
                        className="absolute right-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)]/95 text-[var(--color-accent)] shadow-sm backdrop-blur transition-colors hover:border-[var(--color-danger)] hover:text-[var(--color-danger)] disabled:opacity-60"
                      >
                        <Heart className="h-[18px] w-[18px] fill-current" />
                      </Button>
                    </div>

                    <div className="flex flex-1 flex-col p-4">
                      {product.category && (
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
                          {product.category}
                        </p>
                      )}
                      <h3 className="mt-1 line-clamp-2 text-sm font-medium text-[var(--color-ink)]">
                        <Link
                          to={`/products/${productId}`}
                          className="transition-colors hover:text-[var(--color-primary)]"
                        >
                          {product.name}
                        </Link>
                      </h3>

                      <div className="mt-auto flex items-end justify-between gap-3 pt-3">
                        <p className="font-semibold text-[var(--color-ink)]">
                          {Number.isFinite(price) ? `$${price.toFixed(2)}` : "—"}
                          {product.discountPrice &&
                            product.discountPrice > 0 &&
                            product.discountPrice < product.price && (
                              <span className="ml-2 text-xs font-normal text-[var(--color-ink-muted)] line-through">
                                ${Number(product.price).toFixed(2)}
                              </span>
                            )}
                        </p>

                        <Link
                          to={`/products/${productId}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)] hover:underline"
                        >
                          View
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Wishlist;
