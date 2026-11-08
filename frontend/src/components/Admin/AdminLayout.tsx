import { useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
    BadgePercent,
    Bell,
    Boxes,
    CheckCheck,
    LayoutDashboard,
    ShoppingBag,
    Package,
    Users,
    Store,
    Tags,
    LogOut,
    Menu,
    X,
    XCircle,
} from "lucide-react";
import logo from "../../assets/logo.svg";
import { toast } from "sonner";
import Button from "../Common/Button.tsx";
import { useAuth } from "../../hooks/useAuth.ts";
import { notificationService } from "../../services/notificationService.ts";
import { inventoryService } from "../../services/inventoryService.ts";
import {
    ADMIN_NOTIFICATION_EVENT,
    ADMIN_STOCK_ALERT_EVENT,
    ADMIN_STOCK_UPDATED_EVENT,
    connectAdminSocket,
    disconnectAdminSocket,
} from "../../services/socket.ts";
import type { AdminNotification } from "../../types/notification.ts";
import { formatRelativeTime } from "../../utils/notification.ts";

const AdminLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const initials =
        (user?.name || "")
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part.charAt(0).toUpperCase())
            .join("") || "AD";

    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState<AdminNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
    const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
    const [isSocketConnected, setIsSocketConnected] = useState(false);
    const [outOfStockCount, setOutOfStockCount] = useState(0);
    const notificationsRef = useRef<HTMLDivElement | null>(null);
    const knownNotificationIdsRef = useRef<Set<string>>(new Set());
    const refreshRequestIdRef = useRef(0);
    const lowStockRequestIdRef = useRef(0);
    const lowStockRefreshTimerRef = useRef<number | null>(null);
    const acceptedSocketEventsCountRef = useRef(0);

    const refreshNotifications = useCallback(async () => {
        const requestId = ++refreshRequestIdRef.current;
        const eventsCountAtStart = acceptedSocketEventsCountRef.current;

        try {
            const data = await notificationService.getNotifications({ limit: 12 });
            if (requestId !== refreshRequestIdRef.current) {
                return;
            }

            for (const item of data.notifications) {
                knownNotificationIdsRef.current.add(item._id);
            }

            setNotifications((current) => {
                const map = new Map<string, AdminNotification>();
                for (const item of data.notifications) {
                    map.set(item._id, item);
                }
                for (const item of current) {
                    const existing = map.get(item._id);
                    if (existing) {
                        if (item.isRead && !existing.isRead) {
                            map.set(item._id, { ...existing, isRead: true });
                        }
                    } else {
                        map.set(item._id, item);
                    }
                }

                return Array.from(map.values())
                    .sort(
                        (a, b) =>
                            (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0)
                    )
                    .slice(0, 12);
            });

            if (acceptedSocketEventsCountRef.current === eventsCountAtStart) {
                setUnreadCount(data.unreadCount);
            }
        } catch {
            // Keep the last known state; the badge simply won't update.
        } finally {
            if (requestId === refreshRequestIdRef.current) {
                setIsLoadingNotifications(false);
            }
        }
    }, []);

    const refreshLowStockCount = useCallback(async () => {
        const requestId = ++lowStockRequestIdRef.current;

        try {
            const data = await inventoryService.getLowStock(1);
            if (requestId !== lowStockRequestIdRef.current) return;
            // The sidebar badge highlights rows that are fully out of stock.
            // Low-stock rows are numerous and stay inside the Inventory page.
            setOutOfStockCount(data.counts.out);
        } catch {
            // Keep the last known count; the page itself will surface errors.
        }
    }, []);

    // A bulk update emits one event per row, so coalesce count refreshes.
    const scheduleLowStockRefresh = useCallback(() => {
        if (lowStockRefreshTimerRef.current) {
            window.clearTimeout(lowStockRefreshTimerRef.current);
        }

        lowStockRefreshTimerRef.current = window.setTimeout(() => {
            lowStockRefreshTimerRef.current = null;
            void refreshLowStockCount();
        }, 600);
    }, [refreshLowStockCount]);

    useEffect(() => {
        const socket = connectAdminSocket();
        setIsSocketConnected(socket.connected);
        let retryTimer: ReturnType<typeof setTimeout> | null = null;

        const clearRetryTimer = () => {
            if (retryTimer) {
                clearTimeout(retryTimer);
                retryTimer = null;
            }
        };

        const handleConnect = () => {
            clearRetryTimer();
            setIsSocketConnected(true);
            // Re-sync after a reconnect so events missed while offline appear.
            void refreshNotifications();
            void refreshLowStockCount();
        };

        const handleDisconnect = () => setIsSocketConnected(false);

        const handleConnectError = (error: Error) => {
            setIsSocketConnected(false);
            clearRetryTimer();

            // Retry only when the error is a Server error and the socket is inactive (e.g. not auto-reconnecting)
            if (error.message === "Server error" && !socket.active) {
                retryTimer = setTimeout(() => {
                    retryTimer = null;
                    if (!socket.connected) {
                        socket.connect();
                    }
                }, 5000);
            }
        };

        const handleNotification = (notification: AdminNotification) => {
            if (!notification?._id || knownNotificationIdsRef.current.has(notification._id)) {
                return;
            }

            knownNotificationIdsRef.current.add(notification._id);
            acceptedSocketEventsCountRef.current += 1;

            setNotifications((current) => [
                notification,
                ...current.filter((item) => item._id !== notification._id),
            ].slice(0, 12));

            setUnreadCount((current) => current + 1);

            toast(notification.title, {
                description: notification.message,
            });
        };

        const handleStockAlert = (alert: {
            title?: string;
            message?: string;
        }) => {
            toast.warning(alert?.title || "Low stock alert", {
                description: alert?.message,
            });
            scheduleLowStockRefresh();
        };

        const handleStockUpdated = () => {
            scheduleLowStockRefresh();
        };

        socket.on("connect", handleConnect);
        socket.on("disconnect", handleDisconnect);
        socket.on("connect_error", handleConnectError);
        socket.on(ADMIN_NOTIFICATION_EVENT, handleNotification);
        socket.on(ADMIN_STOCK_ALERT_EVENT, handleStockAlert);
        socket.on(ADMIN_STOCK_UPDATED_EVENT, handleStockUpdated);

        void refreshNotifications();
        void refreshLowStockCount();

        return () => {
            clearRetryTimer();
            if (lowStockRefreshTimerRef.current) {
                window.clearTimeout(lowStockRefreshTimerRef.current);
                lowStockRefreshTimerRef.current = null;
            }
            socket.off("connect", handleConnect);
            socket.off("disconnect", handleDisconnect);
            socket.off("connect_error", handleConnectError);
            socket.off(ADMIN_NOTIFICATION_EVENT, handleNotification);
            socket.off(ADMIN_STOCK_ALERT_EVENT, handleStockAlert);
            socket.off(ADMIN_STOCK_UPDATED_EVENT, handleStockUpdated);
            disconnectAdminSocket();
        };
    }, [refreshNotifications, refreshLowStockCount, scheduleLowStockRefresh]);

    useEffect(() => {
        if (!notificationsOpen) return;

        const handlePointerDown = (event: MouseEvent) => {
            if (
                notificationsRef.current &&
                !notificationsRef.current.contains(event.target as Node)
            ) {
                setNotificationsOpen(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setNotificationsOpen(false);
        };

        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [notificationsOpen]);

    const handleToggleNotifications = () => {
        const nextOpen = !notificationsOpen;
        setNotificationsOpen(nextOpen);
        if (nextOpen) void refreshNotifications();
    };

    const handleMarkAllRead = async () => {
        if (unreadCount === 0 || isMarkingAllRead) return;

        setIsMarkingAllRead(true);
        try {
            await notificationService.markAllAsRead();
            setNotifications((current) =>
                current.map((notification) => ({ ...notification, isRead: true }))
            );
            setUnreadCount(0);
        } catch {
            toast.error("Could not mark notifications as read.");
        } finally {
            setIsMarkingAllRead(false);
        }
    };

    const handleNotificationClick = (notification: AdminNotification) => {
        setNotificationsOpen(false);

        if (!notification.isRead) {
            setNotifications((current) =>
                current.map((item) =>
                    item._id === notification._id ? { ...item, isRead: true } : item
                )
            );
            setUnreadCount((current) => Math.max(0, current - 1));

            void notificationService
                .markAsRead(notification._id)
                .then((count) => setUnreadCount(count))
                .catch(() => void refreshNotifications());
        }

        navigate(`/admin/orders/${notification.order}`);
    };

    const navItems: Array<{
        name: string;
        href: string;
        icon: typeof LayoutDashboard;
        end: boolean;
        badge?: number;
    }> = [
        { name: "Dashboard", href: "/admin", icon: LayoutDashboard, end: true },
        { name: "Products", href: "/admin/products", icon: ShoppingBag, end: false },
        {
            name: "Inventory",
            href: "/admin/inventory",
            icon: Boxes,
            end: false,
            badge: outOfStockCount,
        },
        { name: "Catalog", href: "/admin/catalog", icon: Tags, end: false },
        { name: "Orders", href: "/admin/orders", icon: Package, end: false },
        { name: "Discounts", href: "/admin/discounts", icon: BadgePercent, end: false },
        { name: "Users", href: "/admin/users", icon: Users, end: false },
    ];

    const handleLogout = async () => {
        await logout();
        toast.success("Logged out successfully");
        navigate("/login", { replace: true });
    };

    return (
        <div className="min-h-screen bg-[var(--color-canvas)] flex">
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

                    <Button
                        type="button"
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden text-gray-400 hover:text-white p-1"
                        aria-label="Close sidebar"
                    >
                        <X className="w-5 h-5" />
                    </Button>
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
                                {item.badge ? (
                                    <span
                                        title={`${item.badge} inventory row(s) out of stock`}
                                        className="ml-auto min-w-5 rounded-full bg-red-600 px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white"
                                    >
                                        {item.badge > 99 ? "99+" : item.badge}
                                    </span>
                                ) : null}
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

                    <Button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-all text-left"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Log Out</span>
                    </Button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Admin Topbar */}
                <header className="h-16 bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
                    <div className="flex items-center gap-3">
                        <Button
                            type="button"
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden p-2 rounded-lg text-gray-600 hover:text-black hover:bg-gray-100 transition"
                            aria-label="Open sidebar"
                        >
                            <Menu className="w-5 h-5" />
                        </Button>
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

                        <div className="relative" ref={notificationsRef}>
                            <Button
                                type="button"
                                onClick={handleToggleNotifications}
                                className="relative rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                                aria-label={
                                    unreadCount > 0
                                        ? `Notifications, ${unreadCount} unread`
                                        : "Notifications"
                                }
                                aria-haspopup="true"
                                aria-expanded={notificationsOpen}
                            >
                                <Bell className="h-5 w-5" />
                                {unreadCount > 0 && (
                                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
                                        {unreadCount > 9 ? "9+" : unreadCount}
                                    </span>
                                )}
                            </Button>

                            {notificationsOpen && (
                                <div className="absolute right-0 z-50 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                                    <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">
                                                Notifications
                                            </p>
                                            <p className="flex items-center gap-1.5 text-[11px] text-gray-500">
                                                <span>
                                                    {unreadCount > 0
                                                        ? `${unreadCount} unread`
                                                        : "You're all caught up"}
                                                </span>
                                                <span className="text-gray-300">·</span>
                                                <span
                                                    className={
                                                        isSocketConnected
                                                            ? "font-semibold text-emerald-600"
                                                            : "font-semibold text-amber-600"
                                                    }
                                                >
                                                    {isSocketConnected
                                                        ? "Live"
                                                        : "Reconnecting…"}
                                                </span>
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            onClick={() => void handleMarkAllRead()}
                                            disabled={unreadCount === 0 || isMarkingAllRead}
                                            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 disabled:opacity-40"
                                        >
                                            <CheckCheck className="h-3.5 w-3.5" />
                                            Mark all read
                                        </Button>
                                    </div>

                                    <div className="better-scrollbar max-h-96 overflow-y-auto">
                                        {isLoadingNotifications && notifications.length === 0 ? (
                                            <div className="space-y-3 px-4 py-5">
                                                {Array.from({ length: 3 }, (_, index) => (
                                                    <div key={index} className="flex animate-pulse gap-3">
                                                        <span className="h-9 w-9 shrink-0 rounded-full bg-gray-100" />
                                                        <span className="flex-1 space-y-2">
                                                            <span className="block h-2.5 w-2/3 rounded-full bg-gray-100" />
                                                            <span className="block h-2 w-full rounded-full bg-gray-100" />
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : notifications.length === 0 ? (
                                            <div className="px-5 py-10 text-center">
                                                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                                                    <Bell className="h-5 w-5" />
                                                </span>
                                                <p className="mt-3 text-sm font-semibold text-gray-900">
                                                    No notifications yet
                                                </p>
                                                <p className="mt-1 text-xs text-gray-500">
                                                    New orders and customer cancellations will
                                                    show up here.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-gray-100">
                                                {notifications.map((notification) => {
                                                    const isCancellation =
                                                        notification.type === "order_cancelled";

                                                    return (
                                                        <button
                                                            key={notification._id}
                                                            type="button"
                                                            onClick={() =>
                                                                handleNotificationClick(notification)
                                                            }
                                                            className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-gray-50 ${
                                                                notification.isRead
                                                                    ? ""
                                                                    : "bg-blue-50/50"
                                                            }`}
                                                        >
                                                            <span
                                                                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                                                                    isCancellation
                                                                        ? "bg-red-50 text-red-600"
                                                                        : "bg-emerald-50 text-emerald-600"
                                                                }`}
                                                            >
                                                                {isCancellation ? (
                                                                    <XCircle className="h-4 w-4" />
                                                                ) : (
                                                                    <Package className="h-4 w-4" />
                                                                )}
                                                            </span>

                                                            <span className="min-w-0 flex-1">
                                                                <span className="flex items-start justify-between gap-2">
                                                                    <span className="text-xs font-bold text-gray-900">
                                                                        {notification.title}
                                                                    </span>
                                                                    <span className="shrink-0 text-[10px] text-gray-400">
                                                                        {formatRelativeTime(
                                                                            notification.createdAt
                                                                        )}
                                                                    </span>
                                                                </span>
                                                                <span className="mt-0.5 line-clamp-2 block text-[11px] leading-relaxed text-gray-600">
                                                                    {notification.message}
                                                                </span>
                                                                <span className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                                                                    {notification.orderNumber}
                                                                    {!notification.isRead && (
                                                                        <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                                                                    )}
                                                                </span>
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-2.5 text-center">
                                        <Link
                                            to="/admin/orders"
                                            onClick={() => setNotificationsOpen(false)}
                                            className="text-[11px] font-semibold text-gray-600 transition hover:text-gray-900"
                                        >
                                            View all orders
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2.5 pl-3 border-l border-gray-200">
                            {user?.avatarUrl ? (
                                <img
                                    src={user.avatarUrl}
                                    alt={user.name || "Administrator"}
                                    className="w-8 h-8 rounded-full object-cover border border-gray-200"
                                />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-900 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                                    {initials}
                                </div>
                            )}
                            <div className="hidden md:block text-left max-w-[180px]">
                                <p className="text-xs font-bold text-gray-900 leading-tight truncate">
                                    {user?.name || "Administrator"}
                                </p>
                                <p className="text-[10px] text-gray-500 truncate">
                                    {user?.email || "admin@classyshop.com"}
                                </p>
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
