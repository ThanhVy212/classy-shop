import { Link } from "react-router-dom";
import { mainNavigationLinks } from "../../constants";
import { UserRound, X, ShoppingCart, Menu } from "lucide-react";
import SearchBar from "./SearchBar.tsx";
import CartDrawer from "../Layout/CartDrawer.tsx";
import { useState } from "react";
import { createPortal } from "react-dom";
import Button from "./Button.tsx";
import logo from "../../assets/logo.svg";
import { useAuth } from "../../hooks/useAuth.ts";
import { useCart } from "../../hooks/useCart.ts";

const Navbar = () => {
    const { user, isAuthenticated } = useAuth();
    const { totalItems } = useCart();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [navDrawerOpen, setNavDrawerOpen] = useState(false);

    const toggleNavDrawer = () => {
        setNavDrawerOpen(!navDrawerOpen);
    };

    const toggleDrawer = () => {
        setDrawerOpen(!drawerOpen);
    };

    return (
        <>
            <nav className="container mx-auto flex items-center justify-between px-4 h-14">
                {/* Left - Logo */}
                <div>
                    <Link to="/">
                        <div className="flex items-center">
                            <img src={logo} alt="logo" className="w-9 h-9 sm:w-10 sm:h-10 object-contain mr-2" />
                            <div className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-ink)] hidden sm:block">
                                ClassyShop
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Center - Navigation Links */}
                <div className="hidden md:flex space-x-6">
                    {mainNavigationLinks.map((items) => (
                        <Link
                            key={items.label}
                            to={items.href}
                            className="text-[var(--color-ink-soft)] hover:text-[var(--color-primary)] text-sm font-medium uppercase transition-colors"
                        >
                            {items.label}
                        </Link>
                    ))}
                </div>

                {/* Right - Icons */}
                <div className="flex items-center space-x-3 sm:space-x-4">
                    <Link
                        to={isAuthenticated ? "/profile" : "/login"}
                        aria-label="Profile"
                        className="group flex items-center gap-1.5 sm:gap-2 transition-colors"
                    >
                        <UserRound className="h-5 w-5 text-[var(--color-ink-soft)] group-hover:text-[var(--color-primary)] transition-colors shrink-0" />
                        {isAuthenticated && user?.name && (
                            <span className="text-sm font-medium text-[var(--color-ink-soft)] group-hover:text-[var(--color-primary)] transition-colors max-w-[90px] sm:max-w-[130px] md:max-w-[160px] truncate">
                                {user.name}
                            </span>
                        )}
                    </Link>

                    <Button onClick={toggleDrawer} className="relative cursor-pointer" aria-label="Cart">
                        <ShoppingCart className="h-5 w-5 text-[var(--color-ink-soft)] hover:text-[var(--color-primary)] transition-colors" />
                        {totalItems > 0 && (
                            <span className="badge-red absolute -top-1 -right-2">
                                {totalItems > 99 ? "99+" : totalItems}
                            </span>
                        )}
                    </Button>

                    <SearchBar />

                    <Button onClick={toggleNavDrawer} className="md:hidden cursor-pointer" aria-label="Open menu">
                        <Menu className="h-5 w-5 text-[var(--color-ink-soft)] hover:text-[var(--color-primary)] transition-colors" />
                    </Button>
                </div>
            </nav>

            {/* Cart Drawer */}
            <CartDrawer drawerOpen={drawerOpen} toggleCartDrawer={toggleDrawer} />

            {/* Mobile Navigation Drawer with Portal */}
            {typeof document !== "undefined" &&
                createPortal(
                    <>
                        {navDrawerOpen && (
                            <div
                                onClick={toggleNavDrawer}
                                className="fixed inset-0 bg-black/50 z-[60] transition-opacity duration-300"
                            />
                        )}

                        <div
                            className={`fixed top-0 left-0 z-[70] flex h-full w-3/4 flex-col bg-white shadow-2xl transform transition-transform duration-300 ease-in-out sm:w-1/2 md:w-1/3 ${
                                navDrawerOpen ? "translate-x-0" : "-translate-x-full"
                            }`}
                        >
                            <div className="flex justify-end p-4 border-b border-[var(--color-border)]">
                                <Button onClick={toggleNavDrawer} aria-label="Close menu" className="cursor-pointer">
                                    <X className="h-6 w-6 text-[var(--color-ink-soft)] hover:text-[var(--color-primary)] transition-colors" />
                                </Button>
                            </div>

                            <div className="p-4 flex-1 overflow-y-auto better-scrollbar">
                                <h2 className="text-xl font-semibold text-[var(--color-ink)] mb-4">Menu</h2>
                                <nav className="space-y-4">
                                    {mainNavigationLinks.map((items) => (
                                        <Link
                                            key={items.label}
                                            to={items.href}
                                            onClick={toggleNavDrawer}
                                            className="text-[var(--color-ink-soft)] hover:text-[var(--color-primary)] text-sm font-medium uppercase block transition-colors"
                                        >
                                            {items.label}
                                        </Link>
                                    ))}
                                </nav>

                                <div className="pt-6 mt-6 border-t border-[var(--color-border)]">
                                    {isAuthenticated && user ? (
                                        <Link
                                            to="/profile"
                                            onClick={toggleNavDrawer}
                                            className="flex items-center gap-2.5 text-[var(--color-ink-soft)] hover:text-[var(--color-primary)] font-medium text-sm transition-colors py-1"
                                        >
                                            <UserRound className="h-5 w-5 text-[var(--color-ink-soft)] shrink-0" />
                                            <span className="truncate">{user.name}</span>
                                        </Link>
                                    ) : (
                                        <Link
                                            to="/login"
                                            onClick={toggleNavDrawer}
                                            className="flex items-center gap-2.5 text-[var(--color-ink-soft)] hover:text-[var(--color-primary)] font-medium text-sm transition-colors py-1"
                                        >
                                            <UserRound className="h-5 w-5 text-[var(--color-ink-soft)] shrink-0" />
                                            <span>Login / Register</span>
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>,
                    document.body
                )}
        </>
    );
};

export default Navbar;
