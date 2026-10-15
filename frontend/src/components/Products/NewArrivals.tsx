import Button from "../Common/Button.tsx";
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { sampleNewArrivals } from "../../constants";
import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";

const NewArrivals = () => {
    const scrollRef = useRef<HTMLDivElement>(null);

    const getScrollAmount = () => {
        const container = scrollRef.current;
        if (!container) return 0;

        // Calculate the exact movement distance between two items.
        const firstItem = container.firstElementChild as HTMLElement | null;
        if (!firstItem) return container.clientWidth;

        const secondItem = firstItem.nextElementSibling as HTMLElement | null;
        const itemStep = secondItem
            ? secondItem.offsetLeft - firstItem.offsetLeft
            : firstItem.offsetWidth + 24;

        // Mobile (< 640px): slide exactly one item at a time.
        if (window.innerWidth < 640) {
            return itemStep;
        }
        // Tablet (640px–1023px): display 2 items and slide 2 items at a time.
        if (window.innerWidth < 1024) {
            return itemStep * 2;
        }
        // Desktop (>= 1024px): display 3 items and slide 2 items at a time.
        return itemStep * 3;
    };

    // Scroll by buttons
    const scroll = (direction: "left" | "right") => {
        const container = scrollRef.current;
        if (!container) return;

        const maxScrollLeft = container.scrollWidth - container.clientWidth;
        if (maxScrollLeft <= 0) return;

        const scrollAmount = getScrollAmount();

        if (direction === "right") {
            // Last item, clicking the Next button returns to the first item.
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
            // First item, clicking the Previous button moves to the last item.
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

    // Scroll listeners: wheel & touch
    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return;

        let isResetting = false;

        const handleWheel = (e: WheelEvent) => {
            const maxScrollLeft = container.scrollWidth - container.clientWidth;
            if (maxScrollLeft <= 0) return;

            const isScrollingForward = e.deltaX > 0 || (e.deltaY > 0 && Math.abs(e.deltaY) >= Math.abs(e.deltaX));
            const isScrollingBackward = e.deltaX < 0 || (e.deltaY < 0 && Math.abs(e.deltaY) >= Math.abs(e.deltaX));

            const delta = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;

            if (isScrollingForward) {
                // Last item, returns to the first item.
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
                    // Convert vertical mouse-wheel scrolling
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
                    Discover the latest styles straight off the runway, fresh added to keep your wardrobe on the cutting edge of fashion.
                </p>

                {/* Scroll Buttons */}
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
            </div>

            {/* Scrollable Content */}
            <div
                ref={scrollRef}
                className="container mx-auto overflow-x-auto flex gap-6 relative better-scrollbar pb-6"
            >
                {sampleNewArrivals.map((product) => (
                    <Link
                        key={product._id}
                        to={`/products/${product._id}`}
                        className="w-full min-w-full sm:w-[calc((100%-1.5rem)/2)] sm:min-w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-3rem)/3)] lg:min-w-[calc((100%-3rem)/3)] relative block shrink-0"
                    >
                        <img
                            src={product.images[0]?.url}
                            alt={product.images[0]?.altText || product.name}
                            className="w-full h-[500px] object-cover rounded-lg"
                        />

                        <div className="absolute bottom-0 left-0 right-0 bg-black/30 backdrop-blur-md text-white p-4 rounded-b-lg">
                            <div className="block">
                                <h4 className="font-medium">{product.name}</h4>
                                <p className="mt-1">$ {product.price}</p>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
};

export default NewArrivals;
