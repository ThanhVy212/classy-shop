import { useEffect, useState } from "react";

export const useWindowScroll = () => {
    const getScrollY = () => {
        if (typeof window === "undefined") return 0;
        return (
            window.scrollY ||
            document.documentElement.scrollTop ||
            document.body.scrollTop ||
            0
        );
    };

    const getScrollX = () => {
        if (typeof window === "undefined") return 0;
        return (
            window.scrollX ||
            document.documentElement.scrollLeft ||
            document.body.scrollLeft ||
            0
        );
    };

    const [scrollPosition, setScrollPosition] = useState({
        x: getScrollX(),
        y: getScrollY(),
    });

    useEffect(() => {
        let requestId: number | null = null;

        const handleScroll = () => {
            if (requestId === null) {
                requestId = window.requestAnimationFrame(() => {
                    setScrollPosition({
                        x: getScrollX(),
                        y: getScrollY(),
                    });
                    requestId = null;
                });
            }
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => {
            window.removeEventListener("scroll", handleScroll);
            if (requestId !== null) {
                window.cancelAnimationFrame(requestId);
            }
        };
    }, []);

    return scrollPosition;
};

export default useWindowScroll;
