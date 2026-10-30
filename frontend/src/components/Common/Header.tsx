import Topbar from "../Layout/Topbar.tsx";
import Navbar from "./Navbar.tsx";
import { useEffect, useRef, useState } from "react";
import { useHeaderScroll } from "../../hooks/useHeaderScroll.ts";

const Header = () => {
    const { isNavVisible, isFloating } = useHeaderScroll();
    const navContainerRef = useRef<HTMLElement | null>(null);
    const topbarRef = useRef<HTMLDivElement | null>(null);
    const navbarRef = useRef<HTMLDivElement | null>(null);
    const [headerHeight, setHeaderHeight] = useState<number>(0);

    // Dynamically calculate the uncollapsed full header height
    useEffect(() => {
        const updateHeight = () => {
            const topbarH = topbarRef.current?.offsetHeight ?? 0;
            const navbarH = navbarRef.current?.offsetHeight ?? 0;
            const total = topbarH + navbarH;
            if (total > 0) {
                setHeaderHeight(total);
            }
        };

        updateHeight();

        const resizeObserver =
            typeof ResizeObserver !== "undefined"
                ? new ResizeObserver(() => updateHeight())
                : null;

        if (resizeObserver) {
            if (topbarRef.current) resizeObserver.observe(topbarRef.current);
            if (navbarRef.current) resizeObserver.observe(navbarRef.current);
        }

        window.addEventListener("resize", updateHeight);
        return () => {
            resizeObserver?.disconnect();
            window.removeEventListener("resize", updateHeight);
        };
    }, []);

    useEffect(() => {
        if (!isFloating) {
            navContainerRef.current?.classList.remove("floating-nav");
        } else {
            navContainerRef.current?.classList.add("floating-nav");
        }
    }, [isFloating]);

    return (
        <>
            {/* Height placeholder to prevent content jump behind fixed header */}
            <div
                style={{ height: headerHeight ? `${headerHeight}px` : undefined }}
                className="h-[109px] sm:h-[105px]"
                aria-hidden="true"
            />

            <header
                ref={navContainerRef}
                className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ease-in-out ${
                    isNavVisible
                        ? "translate-y-0 opacity-100"
                        : "-translate-y-full opacity-0 pointer-events-none"
                }`}
            >
                {/* Topbar: collapsed smoothly when scrolling down/floating */}
                <div
                    className={`transition-all duration-300 overflow-hidden ${
                        isFloating ? "max-h-0 opacity-0" : "max-h-20 opacity-100"
                    }`}
                >
                    <div ref={topbarRef}>
                        <Topbar />
                    </div>
                </div>

                {/* Navbar with floating-nav styling when nailed at the top */}
                <div
                    ref={navbarRef}
                    className={`bg-white border-b border-gray-200 transition-all duration-300 ${
                        isFloating ? "floating-nav" : ""
                    }`}
                >
                    <Navbar />
                </div>
            </header>
        </>
    );
};

export default Header;
