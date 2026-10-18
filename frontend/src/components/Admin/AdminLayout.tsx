import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
    LayoutDashboard,
    ShoppingBag,
    Package,
    Users,
    Store,
    LogOut,
    Menu,
    X,
    Bell
} from "lucide-react";
import logo from "../../assets/logo.svg";
import { toast } from "sonner";

const AdminLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const navigate = useNavigate();

    const navItems = [
        { name: "Dashboard", href: "/admin", icon: LayoutDashboard, end: true },
        { name: "Products", href: "/admin/products", icon: ShoppingBag, end: false },
        { name: "Orders", href: "/admin/orders", icon: Package, end: false },
        { name: "Users", href: "/admin/users", icon: Users, end: false },
    ];

    const handleLogout = () => {
        toast.info("Logged out from Admin Panel");
        navigate("/login");
    };

    return (
        <div className="min-h-screen bg-gray-100/70 flex">
            {/* Mobile Sidebar Backdrop */}
            {sidebarOpen && (
                <div
                    onClick={() => setSidebarOpen(false)}
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity"
                />
            )}

            {/* Sidebar (Desktop & Mobile Drawer) */}
            <aside
                className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-gray-950 text-gray-300 flex flex-col z-50 transition-transform duration-300 ease-in-out ${
                    sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                }`}
            >
                {/* Brand / Logo */}
                <div className="h-16 px-6 flex items-center justify-between border-b border-gray-800 shrink-0">
                    <Link to="/admin" className="flex items-center gap-2.5">
                        <img src={logo} alt="ClassyShop" className="w-8 h-8 object-contain" />
                        <div>
                            <span className="font-bold text-white text-base tracking-tight block leading-tight">
                                ClassyShop
                            </span>
                        </div>
                    </Link>

                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden text-gray-400 hover:text-white p-1"
                        aria-label="Close sidebar"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto better-scrollbar">
                    <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
                        Management
                    </p>

                    {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <NavLink
                                key={item.name}
                                to={item.href}
                                end={item.end}
                                onClick={() => setSidebarOpen(false)}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                        isActive
                                            ? "bg-white text-gray-950 font-semibold shadow-xs"
                                            : "text-gray-400 hover:text-white hover:bg-gray-900"
                                    }`
                                }
                            >
                                <Icon className="w-4 h-4 shrink-0" />
                                <span>{item.name}</span>
                            </NavLink>
                        );
                    })}
                </nav>

                {/* Bottom Actions */}
                <div className="p-4 border-t border-gray-800 space-y-1 shrink-0">
                    <Link
                        to="/"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-900 transition-all"
                    >
                        <Store className="w-4 h-4 text-emerald-400" />
                        <span>View Live Store</span>
                    </Link>

                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-all cursor-pointer text-left"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Log Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Admin Topbar */}
                <header className="h-16 bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden p-2 rounded-lg text-gray-600 hover:text-black hover:bg-gray-100 transition"
                            aria-label="Open sidebar"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <h2 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                            Admin Control Panel
                        </h2>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4">
                        <Link
                            to="/"
                            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                        >
                            <Store className="w-3.5 h-3.5" />
                            <span>Storefront</span>
                        </Link>

                        <button
                            onClick={() => toast.info("No unread admin notifications")}
                            className="p-2 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition relative cursor-pointer"
                            aria-label="Notifications"
                        >
                            <Bell className="w-5 h-5" />
                            <span className="w-2 h-2 rounded-full bg-red-600 absolute top-1.5 right-1.5" />
                        </button>

                        <div className="flex items-center gap-2.5 pl-3 border-l border-gray-200">
                            <div className="w-8 h-8 rounded-full bg-gray-900 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                                AD
                            </div>
                            <div className="hidden md:block text-left">
                                <p className="text-xs font-bold text-gray-900 leading-tight">Admin Manager</p>
                                <p className="text-[10px] text-gray-500">Super Administrator</p>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page View Outlet */}
                <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
