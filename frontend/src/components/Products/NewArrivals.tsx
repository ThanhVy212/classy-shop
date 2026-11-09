import Button from "../Common/Button.tsx";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import EmptyState from "../Common/EmptyState.tsx";
import OptimizedImage from "../Common/OptimizedImage.tsx";
import { ProductCarouselSkeleton } from "../Common/Skeletons.tsx";
import { productService } from "../../services/productService.ts";
import { isNotFoundError } from "../../utils/apiError.ts";
import type { Product } from "../../types/product.ts";

const NewArrivals = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setHasError(false);

    productService
      .getNewArrivals()
      .then((data) => {
        if (isMounted) {
          setProducts(Array.isArray(data) ? data : []);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch new arrivals from backend:", err);
        if (isMounted) {
          setProducts([]);
          setHasError(!isNotFoundError(err));
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  const getScrollAmount = () => {
    const container = scrollRef.current;
    if (!container) return 0;

    const firstItem = container.firstElementChild as HTMLElement | null;
    if (!firstItem) return container.clientWidth;

    const secondItem = firstItem.nextElementSibling as HTMLElement | null;
    const itemStep = secondItem
      ? secondItem.offsetLeft - firstItem.offsetLeft
      : firstItem.offsetWidth + 24;

    if (window.innerWidth < 640) {
      return itemStep;
    }
    if (window.innerWidth < 1024) {
      return itemStep * 2;
    }
    return itemStep * 3;
  };

  const scroll = (direction: "left" | "right") => {
    const container = scrollRef.current;
    if (!container) return;

    const maxScrollLeft = container.scrollWidth - container.clientWidth;
    if (maxScrollLeft <= 0) return;

    const scrollAmount = getScrollAmount();

    if (direction === "right") {
      if (container.scrollLeft >= maxScrollLeft - 10) {
        container.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        const nextScroll = container.scrollLeft + scrollAmount;
        container.scrollTo({
          left: nextScroll >= maxScrollLeft - 10 ? maxScrollLeft : nextScroll,
          behavior: "smooth",
        });
      }
    } else {
      if (container.scrollLeft <= 10) {
        container.scrollTo({ left: maxScrollLeft, behavior: "smooth" });
      } else {
        const nextScroll = container.scrollLeft - scrollAmount;
        container.scrollTo({
          left: nextScroll <= 10 ? 0 : nextScroll,
          behavior: "smooth",
        });
      }
    }
  };

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    let isResetting = false;

    const handleWheel = (e: WheelEvent) => {
      const maxScrollLeft = container.scrollWidth - container.clientWidth;
      if (maxScrollLeft <= 0) return;

      const isScrollingForward =
        e.deltaX > 0 || (e.deltaY > 0 && Math.abs(e.deltaY) >= Math.abs(e.deltaX));
      const isScrollingBackward =
        e.deltaX < 0 || (e.deltaY < 0 && Math.abs(e.deltaY) >= Math.abs(e.deltaX));

      const delta = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;

      if (isScrollingForward) {
        if (container.scrollLeft >= maxScrollLeft - 10) {
          e.preventDefault();
          if (!isResetting) {
            isResetting = true;
            container.scrollTo({ left: 0, behavior: "smooth" });
            setTimeout(() => {
              isResetting = false;
            }, 800);
          }
        } else if (e.deltaY !== 0 && e.deltaX === 0) {
          e.preventDefault();
          container.scrollLeft += delta;
        }
      } else if (isScrollingBackward) {
        if (e.deltaY !== 0 && e.deltaX === 0 && container.scrollLeft > 0) {
          e.preventDefault();
          container.scrollLeft += delta;
        }
      }
    };

    let touchStartX = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const maxScrollLeft = container.scrollWidth - container.clientWidth;
      if (maxScrollLeft <= 0) return;

      const touchCurrentX = e.touches[0].clientX;
      const diff = touchStartX - touchCurrentX;

      if (diff > 30 && container.scrollLeft >= maxScrollLeft - 10) {
        if (!isResetting) {
          isResetting = true;
          touchStartX = touchCurrentX;
          container.scrollTo({ left: 0, behavior: "smooth" });
          setTimeout(() => {
            isResetting = false;
          }, 800);
        }
      }
    };

    let scrollTimeout: number;
    const handleContainerScroll = () => {
      container.classList.add("is-scrolling");
      window.clearTimeout(scrollTimeout);
      scrollTimeout = window.setTimeout(() => {
        container.classList.remove("is-scrolling");
      }, 1000);
    };

    container.addEventListener("scroll", handleContainerScroll, { passive: true });
    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: true });

    return () => {
      window.clearTimeout(scrollTimeout);
      container.removeEventListener("scroll", handleContainerScroll);
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  return (
    <section className="py-16 px-4 lg:px-0">
      <div className="container mx-auto text-center mb-10 relative">
        <h2 className="text-3xl font-bold mb-4">Explore New Arrivals</h2>
        <p className="text-lg text-gray-600 mb-8">
          Discover the latest styles straight off the runway, freshly added to keep your wardrobe on the cutting edge of fashion.
        </p>

        {/* Scroll Buttons */}
        {!loading && products.length > 0 && (
          <div className="absolute right-0 bottom-[-30px] flex space-x-2">
            <Button
              className="btn-qty"
              onClick={() => scroll("left")}
              aria-label="Previous items"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              className="btn-qty"
              onClick={() => scroll("right")}
              aria-label="Next items"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>
        )}
      </div>

      {/* Scrollable Content */}
      <div
        ref={scrollRef}
        className="container mx-auto overflow-x-auto flex gap-6 relative better-scrollbar pb-6"
      >
        {loading ? (
          <ProductCarouselSkeleton count={3} />
        ) : products.length === 0 ? (
          <EmptyState
            className="w-full"
            title={hasError ? "Unable to load new arrivals" : "No new arrivals yet"}
            description={
              hasError
                ? "We couldn't reach the catalog right now. Please try again in a moment."
                : "Fresh pieces will appear here as soon as they are added to the store."
            }
            action={
              hasError
                ? {
                    label: "Try again",
                    onClick: () => setReloadKey((current) => current + 1),
                  }
                : { label: "Browse all products", to: "/collections/all" }
            }
          />
        ) : (
          products.map((product) => {
            const imgUrl = product.images?.[0]?.url || product.image || "";
            return (
              <Link
                key={product._id}
                to={`/products/${product._id}`}
                className="w-full min-w-full sm:w-[calc((100%-1.5rem)/2)] sm:min-w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-3rem)/3)] lg:min-w-[calc((100%-3rem)/3)] relative block shrink-0 group"
              >
                <div className="overflow-hidden rounded-lg bg-[var(--color-surface-muted)]">
                  {imgUrl ? (
                    <OptimizedImage
                      src={imgUrl}
                      alt={product.images?.[0]?.altText || product.name}
                      widths={[320, 480, 640, 960, 1280]}
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      crop="fill"
                      className="w-full h-[500px] object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-[500px] w-full flex-col items-center justify-center gap-2 text-[var(--color-ink-muted)]">
                      <ImageOff className="h-8 w-8" />
                      <span className="text-xs font-medium uppercase tracking-[0.18em]">
                        No image
                      </span>
                    </div>
                  )}
                </div>

                <div className="absolute bottom-0 left-0 right-0 bg-black/40 backdrop-blur-md text-white p-4 rounded-b-lg">
                  <div className="block">
                    <h4 className="font-medium text-lg">{product.name}</h4>
                    <p className="mt-1 font-semibold">${product.price}</p>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </section>
  );
};

export default NewArrivals;
