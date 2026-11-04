import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  ExternalLink,
  Filter,
  Package,
  RefreshCw,
  Search,
  Truck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import Button from "../Common/Button.tsx";
import CancelOrderDialog from "../Orders/CancelOrderDialog";
import { orderService } from "../../services/orderService";
import type {
  Order,
  OrderStats,
  OrderStatus,
  PaymentStatus,
} from "../../types/order";
import {
  formatMoney,
  formatOrderDate,
  getOrderItemsCount,
  ORDER_STATUSES,
  ORDER_STATUS_CLASSES,
  PAYMENT_STATUS_META,
} from "../../utils/order";
import { getApiErrorMessage } from "../../utils/apiError";

const PAGE_SIZE = 10;

const PAYMENT_STATUSES: PaymentStatus[] = [
  "pending",
  "paid",
  "failed",
  "refunded",
];

const getCustomer = (order: Order) => {
  const user =
    order.user && typeof order.user === "object" ? order.user : undefined;

  return {
    name: user?.name || order.shippingAddress.fullName || "Guest",
    email: order.contactEmail || user?.email || "—",
  };
};

const OrderManagement = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | "all">(
    "all"
  );
  const [sort, setSort] = useState("newest");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingStats, setIsRefreshingStats] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadStats = useCallback(async () => {
    setIsRefreshingStats(true);

    try {
      const data = await orderService.getOrderStats();
      setStats(data.stats);
    } catch {
      // The table can still work when stats fail; avoid a second error banner.
    } finally {
      setIsRefreshingStats(false);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await orderService.getAllOrders({
        page,
        limit: PAGE_SIZE,
        status: statusFilter,
        paymentStatus: paymentFilter,
        search,
        sort: sort as "newest" | "oldest" | "totalDesc" | "totalAsc",
      });

      setOrders(data.orders);
      setPages(data.pages);
      setTotal(data.total);
    } catch (loadError) {
      setError(
        getApiErrorMessage(loadError, "Could not load orders right now.")
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, paymentFilter, search, sort]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const replaceOrder = (updated: Order) => {
    setOrders((current) =>
      current.map((order) => (order._id === updated._id ? updated : order))
    );
  };

  const handleStatusChange = async (
    order: Order,
    nextStatus: OrderStatus
  ) => {
    if (nextStatus === order.orderStatus) return;

    if (nextStatus === "Cancelled") {
      setCancelTarget(order);
      return;
    }

    setUpdatingId(order._id);

    try {
      const updated = await orderService.updateOrderStatus(
        order._id,
        nextStatus
      );
      replaceOrder(updated);
      void loadStats();
      void loadOrders();
      toast.success(
        `Order ${order.orderNumber} marked as ${updated.orderStatus}`
      );
    } catch (updateError) {
      toast.error(
        getApiErrorMessage(updateError, "Could not update order status.")
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleConfirmCancel = async (reason: string) => {
    if (!cancelTarget) return;

    const order = cancelTarget;
    setIsCancelling(true);
    setUpdatingId(order._id);

    try {
      const updated = await orderService.updateOrderStatus(
        order._id,
        "Cancelled",
        reason
      );
      replaceOrder(updated);
      setCancelTarget(null);
      void loadStats();
      void loadOrders();
      toast.success(`Order ${order.orderNumber} cancelled`);
    } catch (updateError) {
      toast.error(
        getApiErrorMessage(updateError, "Could not cancel this order.")
      );
    } finally {
      setIsCancelling(false);
      setUpdatingId(null);
    }
  };

  const handlePaymentChange = async (
    order: Order,
    nextStatus: PaymentStatus
  ) => {
    if (nextStatus === order.paymentStatus) return;

    setUpdatingId(order._id);

    try {
      const updated = await orderService.updatePaymentStatus(
        order._id,
        nextStatus
      );
      replaceOrder(updated);
      void loadStats();
      void loadOrders();
      toast.success(
        `Payment for ${order.orderNumber} marked as ${updated.paymentStatus}`
      );
    } catch (updateError) {
      toast.error(
        getApiErrorMessage(updateError, "Could not update payment status.")
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const statusCounts = stats?.statusCounts ?? {
    Processing: 0,
    Shipped: 0,
    Delivered: 0,
    Cancelled: 0,
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="page-title">Orders management</h1>
            <span className="badge-counter">{total} total</span>
          </div>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
            Track customer orders, update fulfilment and settle cash on
            delivery payments.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => {
            void loadOrders();
            void loadStats();
          }}
          disabled={isRefreshingStats}
          className="btn-outline inline-flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefreshingStats ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <div className="admin-stat-pill">
          <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-ink-soft)]">
            <DollarSign className="h-3.5 w-3.5" />
            Paid revenue
          </span>
          <p className="mt-1 text-xl font-bold text-[var(--color-primary)]">
            {formatMoney(stats?.totalRevenue ?? 0)}
          </p>
        </div>

        <div className="admin-stat-pill">
          <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-ink-soft)]">
            <Clock className="h-3.5 w-3.5" />
            Pending payment
          </span>
          <p className="mt-1 text-xl font-bold text-amber-600">
            {stats?.pendingPayments ?? 0}
          </p>
        </div>

        <div className="admin-stat-pill">
          <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-ink-soft)]">
            <Package className="h-3.5 w-3.5" />
            Processing
          </span>
          <p className="mt-1 text-xl font-bold text-amber-600">
            {statusCounts.Processing}
          </p>
        </div>

        <div className="admin-stat-pill">
          <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-ink-soft)]">
            <Truck className="h-3.5 w-3.5" />
            Shipped
          </span>
          <p className="mt-1 text-xl font-bold text-blue-600">
            {statusCounts.Shipped}
          </p>
        </div>

        <div className="admin-stat-pill">
          <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-ink-soft)]">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Delivered
          </span>
          <p className="mt-1 text-xl font-bold text-emerald-600">
            {statusCounts.Delivered}
          </p>
        </div>

        <div className="admin-stat-pill">
          <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-ink-soft)]">
            <XCircle className="h-3.5 w-3.5" />
            Cancelled
          </span>
          <p className="mt-1 text-xl font-bold text-red-600">
            {statusCounts.Cancelled}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col items-stretch justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-xs md:flex-row md:items-center">
        <div className="relative w-full md:max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-ink-muted)]" />
          <input
            type="text"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search order number, name, email, phone…"
            className="admin-search-input"
            aria-label="Search orders"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 shrink-0 text-[var(--color-ink-muted)]" />
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as OrderStatus | "all");
                setPage(1);
              }}
              className="admin-filter-select"
              aria-label="Filter by fulfilment status"
            >
              <option value="all">All fulfilment</option>
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <select
            value={paymentFilter}
            onChange={(event) => {
              setPaymentFilter(event.target.value as PaymentStatus | "all");
              setPage(1);
            }}
            className="admin-filter-select"
            aria-label="Filter by payment status"
          >
            <option value="all">All payments</option>
            {PAYMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {PAYMENT_STATUS_META[status].label}
              </option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(event) => {
              setSort(event.target.value);
              setPage(1);
            }}
            className="admin-filter-select"
            aria-label="Sort orders"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="totalDesc">Highest total</option>
            <option value="totalAsc">Lowest total</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <p>{error}</p>
            <Button
              type="button"
              onClick={() => void loadOrders()}
              className="mt-2 text-xs font-semibold underline underline-offset-2"
            >
              Try again
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card-container">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="table-head-row">
              <tr>
                <th className="px-5 py-3.5">Order</th>
                <th className="px-5 py-3.5">Customer</th>
                <th className="px-5 py-3.5">Items</th>
                <th className="px-5 py-3.5">Total</th>
                <th className="px-5 py-3.5">Payment</th>
                <th className="px-5 py-3.5">Fulfilment</th>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[var(--color-border)]">
              {isLoading ? (
                Array.from({ length: 5 }, (_, index) => (
                  <tr key={index} className="animate-pulse">
                    <td className="px-5 py-4">
                      <div className="h-3 w-24 rounded-full bg-[var(--color-surface-muted)]" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-3 w-32 rounded-full bg-[var(--color-surface-muted)]" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-3 w-12 rounded-full bg-[var(--color-surface-muted)]" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-3 w-16 rounded-full bg-[var(--color-surface-muted)]" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-6 w-20 rounded-full bg-[var(--color-surface-muted)]" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-7 w-28 rounded-xl bg-[var(--color-surface-muted)]" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-3 w-20 rounded-full bg-[var(--color-surface-muted)]" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="ml-auto h-3 w-16 rounded-full bg-[var(--color-surface-muted)]" />
                    </td>
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-surface-muted)] text-[var(--color-ink-muted)]">
                      <Package className="h-6 w-6" />
                    </span>
                    <p className="mt-4 text-sm font-semibold text-[var(--color-ink)]">
                      No orders found
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
                      Try a different search term or clear the filters.
                    </p>
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const customer = getCustomer(order);
                  const itemsCount = getOrderItemsCount(order.orderItems);
                  const isBusy = updatingId === order._id;

                  return (
                    <tr
                      key={order._id}
                      className={`table-row-hover ${
                        isBusy ? "opacity-60" : ""
                      }`}
                    >
                      <td className="whitespace-nowrap px-5 py-4">
                        <Link
                          to={`/admin/orders/${order._id}`}
                          className="font-semibold text-[var(--color-ink)] transition-colors hover:text-[var(--color-primary)]"
                        >
                          {order.orderNumber}
                        </Link>
                        <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
                          Cash on delivery
                        </p>
                        {order.orderStatus === "Cancelled" && (
                          <p
                            className="mt-1 max-w-[220px] truncate text-[11px] text-[var(--color-danger)]"
                            title={order.cancelReason || "No reason provided"}
                          >
                            Reason: {order.cancelReason || "No reason provided"}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-[var(--color-ink)]">
                          {customer.name}
                        </p>
                        <p className="text-xs text-[var(--color-ink-soft)]">
                          {customer.email}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-xs text-[var(--color-ink-soft)]">
                        {itemsCount} item{itemsCount === 1 ? "" : "s"}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 font-semibold text-[var(--color-ink)]">
                        {formatMoney(order.totalPrice)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <select
                          value={order.paymentStatus}
                          onChange={(event) =>
                            void handlePaymentChange(
                              order,
                              event.target.value as PaymentStatus
                            )
                          }
                          disabled={isBusy || order.orderStatus === "Cancelled"}
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold focus:outline-none disabled:opacity-60 ${
                            PAYMENT_STATUS_META[order.paymentStatus].className
                          }`}
                          aria-label={`Payment status for ${order.orderNumber}`}
                        >
                          {PAYMENT_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {
                                PAYMENT_STATUS_META[status].label
                              }
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <select
                          value={order.orderStatus}
                          onChange={(event) =>
                            void handleStatusChange(
                              order,
                              event.target.value as OrderStatus
                            )
                          }
                          disabled={
                            isBusy || order.orderStatus === "Cancelled"
                          }
                          className={`rounded-xl border px-2.5 py-1.5 text-xs font-semibold focus:outline-none disabled:opacity-60 ${
                            ORDER_STATUS_CLASSES[order.orderStatus]
                          }`}
                          aria-label={`Fulfilment status for ${order.orderNumber}`}
                        >
                          {ORDER_STATUSES.map((status) => (
                            <option
                              key={status}
                              value={status}
                              disabled={
                                status === "Cancelled" &&
                                order.orderStatus !== "Processing"
                              }
                            >
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-xs text-[var(--color-ink-soft)]">
                        {formatOrderDate(order.createdAt)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        <Link
                          to={`/admin/orders/${order._id}`}
                          className="admin-action-link"
                        >
                          <span>View order</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          <span>
            Showing {orders.length} of {total} orders
          </span>

          {pages > 1 ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-[var(--color-border-strong)] p-1.5 transition-colors hover:bg-[var(--color-surface-muted)] disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs font-medium">
                Page {page} of {pages}
              </span>
              <Button
                type="button"
                onClick={() =>
                  setPage((current) => Math.min(pages, current + 1))
                }
                disabled={page >= pages}
                className="rounded-lg border border-[var(--color-border-strong)] p-1.5 transition-colors hover:bg-[var(--color-surface-muted)] disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <span className="font-medium">ClassyShop fulfilment engine</span>
          )}
        </div>
      </div>

      <CancelOrderDialog
        open={cancelTarget !== null}
        orderNumber={cancelTarget?.orderNumber}
        isSubmitting={isCancelling}
        onClose={() => {
          if (!isCancelling) setCancelTarget(null);
        }}
        onConfirm={handleConfirmCancel}
      />
    </div>
  );
};

export default OrderManagement;
