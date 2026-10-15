import Topbar from "../Layout/Topbar.tsx";
import Navbar from "./Navbar.tsx";
import { useEffect, useRef, useState } from "react";
import { useWindowScroll } from "../../hooks/useWindowScroll.ts";

const Header = () => {
    const [lastScrollY, setLastScrollY] = useState(0);
    const [isNavVisible, setIsNavVisible] = useState(true);
    const [isFloating, setIsFloating] = useState(false);
    const navContainerRef = useRef<HTMLDivElement | null>(null);

    const { y: currentScrollY } = useWindowScroll();

    useEffect(() => {
        if (currentScrollY === 0) {
            setIsNavVisible(true);
            setIsFloating(false);
            navContainerRef.current?.classList.remove("floating-nav");
        } else if (currentScrollY > lastScrollY && currentScrollY > 50) {
            setIsNavVisible(false);
            setIsFloating(true);
            navContainerRef.current?.classList.add("floating-nav");
        } else if (currentScrollY < lastScrollY) {
            setIsNavVisible(true);
            setIsFloating(true);
            navContainerRef.current?.classList.add("floating-nav");
        }

        setLastScrollY(currentScrollY);
    }, [currentScrollY, lastScrollY]);

    return (
        <>
            {/* Height placeholder to prevent content jump behind fixed header */}
            <div className="h-[96px] sm:h-[100px]" />

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
                        isFloating ? "max-h-0 opacity-0" : "max-h-12 opacity-100"
                    }`}
                >
                    <Topbar />
                </div>

                {/* Navbar with floating-nav styling when nailed at the top */}
                <div
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
