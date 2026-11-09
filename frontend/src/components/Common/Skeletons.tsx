const pulse = "animate-pulse bg-[var(--color-surface-muted)]";

interface SkeletonProps {
  className?: string;
}

/** Basic shimmer block used to build page-specific skeletons. */
export const Skeleton = ({ className = "" }: SkeletonProps) => (
  <div className={`rounded-md ${pulse} ${className}`} aria-hidden="true" />
);

interface ProductCardSkeletonProps {
  className?: string;
}

/** Generic page skeleton used while auth or route data is being resolved. */
export const PageSkeleton = () => (
  <div
    className="min-h-[70vh] bg-[var(--color-canvas)] px-4 py-8 sm:px-6 sm:py-10 lg:px-8"
    role="status"
    aria-label="Loading page"
  >
    <div className="mx-auto w-full max-w-6xl">
      <Skeleton className="h-3 w-40" />
      <div className="mt-6 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="mt-3 h-4 w-1/2" />
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-4">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
          <div className="space-y-4 lg:col-span-8">
            <Skeleton className="h-16 rounded-2xl" />
            <Skeleton className="h-16 rounded-2xl" />
            <Skeleton className="h-16 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
    <span className="sr-only">Loading page…</span>
  </div>
);

/** Mirrors the ProductGrid card: image frame above title and price. */
export const ProductCardSkeleton = ({
  className = "",
}: ProductCardSkeletonProps) => (
  <div className={className} aria-hidden="true">
    <div className={`aspect-[3/4] rounded-2xl border border-[var(--color-border)] ${pulse}`} />
    <div className="mt-3 space-y-2">
      <Skeleton className="h-3.5 w-4/5" />
      <Skeleton className="h-3.5 w-1/3" />
    </div>
  </div>
);

interface ProductGridSkeletonProps {
  count?: number;
  className?: string;
}

export const ProductGridSkeleton = ({
  count = 8,
  className = "",
}: ProductGridSkeletonProps) => (
  <div
    className={`grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 ${className}`}
    role="status"
    aria-label="Loading products"
  >
    {Array.from({ length: count }).map((_, index) => (
      <ProductCardSkeleton key={index} />
    ))}
    <span className="sr-only">Loading products…</span>
  </div>
);

interface ProductCarouselSkeletonProps {
  count?: number;
}

/**
 * Horizontal cards for the new arrivals rail. Rendered as direct children of
 * the scrolling flex container so the widths match the real product cards.
 */
export const ProductCarouselSkeleton = ({
  count = 3,
}: ProductCarouselSkeletonProps) => (
  <>
    {Array.from({ length: count }).map((_, index) => (
      <div
        key={index}
        className="w-full min-w-full shrink-0 sm:w-[calc((100%-1.5rem)/2)] sm:min-w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-3rem)/3)] lg:min-w-[calc((100%-3rem)/3)]"
        aria-hidden="true"
      >
        <div className={`h-[500px] rounded-lg ${pulse}`} />
        <div className="mt-3 space-y-2">
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-3.5 w-1/4" />
        </div>
      </div>
    ))}
    <span className="sr-only">Loading new arrivals…</span>
  </>
);

/** Skeleton for the product detail page / home best-seller block. */
export const ProductDetailsSkeleton = () => (
  <div
    className="bg-[var(--color-canvas)] px-4 py-8 sm:px-6 sm:py-10"
    role="status"
    aria-label="Loading product"
  >
    <div className="mx-auto max-w-6xl rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xs sm:p-8 lg:p-10">
      <div className="flex flex-col md:flex-row">
        <div className="mr-6 hidden flex-col space-y-4 md:flex">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-20 rounded-xl" />
          ))}
        </div>

        <div className="md:w-1/2">
          <Skeleton className="aspect-square w-full rounded-2xl" />
        </div>

        <div className="mt-8 space-y-4 md:ml-10 md:mt-0 md:w-1/2">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-1/4" />
          <div className="space-y-2 pt-2">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-11/12" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>
          <div className="space-y-2 pt-3">
            <Skeleton className="h-3.5 w-16" />
            <div className="flex gap-2.5">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-8 w-8 rounded-full" />
              ))}
            </div>
          </div>
          <div className="space-y-2 pt-3">
            <Skeleton className="h-3.5 w-12" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-14 rounded-xl" />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Skeleton className="h-12 flex-1 rounded-2xl" />
            <Skeleton className="h-12 w-[52px] rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
    <span className="sr-only">Loading product…</span>
  </div>
);

/** Skeleton for the shopping bag page. */
export const CartSkeleton = () => (
  <div
    className="min-h-screen bg-[var(--color-canvas)] pb-16 pt-8 sm:pt-10"
    role="status"
    aria-label="Loading your bag"
  >
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
      <Skeleton className="h-3 w-36" />
      <Skeleton className="mt-6 h-9 w-52" />
      <Skeleton className="mt-3 h-4 w-72 max-w-full" />

      <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-10">
        <div className="space-y-6 lg:col-span-7">
          <div className="checkout-card overflow-hidden">
            <div className="border-b border-[var(--color-border)] px-6 py-4">
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="divide-y divide-[var(--color-border)] px-6">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="flex gap-4 py-6 sm:gap-5">
                  <Skeleton className="h-32 w-24 shrink-0 rounded-xl sm:h-36 sm:w-28" />
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-4 w-3/5" />
                    <Skeleton className="h-3 w-2/5" />
                    <Skeleton className="h-3 w-1/4" />
                    <div className="flex items-center justify-between pt-8">
                      <Skeleton className="h-8 w-24 rounded-full" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Skeleton className="h-14 rounded-2xl" />
        </div>

        <aside className="lg:col-span-5">
          <div className="checkout-card p-6">
            <Skeleton className="h-10 w-40" />
            <div className="mt-6 space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <Skeleton className="mt-6 h-12 w-full rounded-2xl" />
            <Skeleton className="mt-3 h-12 w-full rounded-2xl" />
          </div>
        </aside>
      </div>
    </div>
    <span className="sr-only">Loading your bag…</span>
  </div>
);

/** Compact rows used inside the cart drawer. */
export const CartContentSkeleton = () => (
  <div className="divide-y divide-gray-200" role="status" aria-label="Loading your cart">
    {Array.from({ length: 2 }).map((_, index) => (
      <div key={index} className="flex gap-4 py-4" aria-hidden="true">
        <Skeleton className="h-24 w-20 shrink-0 rounded-lg" />
        <div className="flex-1 space-y-2.5">
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-3 w-2/5" />
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
      </div>
    ))}
    <span className="sr-only">Loading your cart…</span>
  </div>
);

/** Skeleton for the checkout page. */
export const CheckoutSkeleton = () => (
  <div
    className="min-h-screen bg-[var(--color-canvas)] pb-16 pt-8 sm:pt-10"
    role="status"
    aria-label="Preparing checkout"
  >
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
      <Skeleton className="h-3 w-36" />
      <Skeleton className="mt-6 h-9 w-64" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />

      <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-10">
        <div className="space-y-6 lg:col-span-7">
          <div className="checkout-card p-6">
            <Skeleton className="h-5 w-40" />
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-11 w-full rounded-xl" />
              ))}
            </div>
          </div>
          <div className="checkout-card p-6">
            <Skeleton className="h-5 w-32" />
            <div className="mt-6 space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </div>

        <aside className="lg:col-span-5">
          <div className="checkout-card p-6">
            <Skeleton className="h-10 w-40" />
            <div className="mt-6 space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <Skeleton className="mt-6 h-12 w-full rounded-2xl" />
          </div>
        </aside>
      </div>
    </div>
    <span className="sr-only">Preparing checkout…</span>
  </div>
);

/** Skeleton for the customer order detail page. */
export const OrderDetailsSkeleton = () => (
  <div
    className="min-h-screen bg-[var(--color-canvas)] px-4 py-8 sm:px-6 sm:py-10 lg:px-8"
    role="status"
    aria-label="Loading order"
  >
    <div className="mx-auto w-full max-w-6xl">
      <Skeleton className="h-3 w-32" />
      <div className="checkout-card mt-5 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="space-y-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-3.5 w-44" />
            <Skeleton className="h-3.5 w-52" />
          </div>
          <Skeleton className="h-24 w-52 rounded-2xl" />
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex flex-col items-center gap-2">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-2.5 w-12" />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card-container p-6">
            <Skeleton className="h-5 w-40" />
            <div className="mt-5 space-y-4">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="flex items-center gap-4">
                  <Skeleton className="h-20 w-16 shrink-0 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/5" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="card-padded">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="mt-4 space-y-2.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-3/5" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="card-padded">
            <Skeleton className="h-5 w-36" />
            <div className="mt-5 space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-4 w-full" />
              ))}
            </div>
            <Skeleton className="mt-6 h-11 w-full rounded-xl" />
          </div>
          <div className="card-padded">
            <Skeleton className="h-5 w-32" />
            <div className="mt-5 space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
    <span className="sr-only">Loading order…</span>
  </div>
);
