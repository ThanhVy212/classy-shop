import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Package,
  ShoppingBag,
  Truck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import CancelOrderDialog from "../components/Orders/CancelOrderDialog";
import { orderService } from "../services/orderService";
import type { Order, OrderStatus } from "../types/order";
import {
  formatMoney,
  formatOrderDate,
  getOrderItemsCount,
  ORDER_STATUS_CLASSES,
  ORDER_STATUSES,
  PAYMENT_STATUS_META,
} from "../utils/order";
import { getApiErrorMessage } from "../utils/apiError";

const PAGE_SIZE = 5;

const STATUS_TABS: Array<{ value: OrderStatus | "all"; label: string }> = [
  { value: "all", label: "All orders" },
  ...ORDER_STATUSES.map((status) => ({ value: status, label: status })),
];

const OrderSkeleton = () => (
  <div className="card-container animate-pulse p-5 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="space-y-2">
        <div className="h-3 w-28 rounded-full bg-[var(--color-surface-muted)]" />
        <div className="h-3 w-20 rounded-full bg-[var(--color-surface-muted)]" />
      </div>
      <div className="h-6 w-24 rounded-full bg-[var(--color-surface-muted)]" />
    </div>
    <div className="mt-5 flex gap-3">
      <div className="h-20 w-16 rounded-xl bg-[var(--color-surface-muted)]" />
      <div className="h-20 w-16 rounded-xl bg-[var(--color-surface-muted)]" />
      <div className="h-20 w-16 rounded-xl bg-[var(--color-surface-muted)]" />
    </div>
  </div>
);

const MyOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await orderService.getMyOrders({
        page,
        limit: PAGE_SIZE,
        status: statusFilter,
      });

      setOrders(data.orders);
      setPages(data.pages);
      setTotal(data.total);
    } catch (loadError) {
      setError(
        getApiErrorMessage(loadError, "We couldn't load your orders right now.")
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const handleStatusChange = (status: OrderStatus | "all") => {
    setStatusFilter(status);
    setPage(1);
  };

  const handleCancel = (order: Order) => {
    setCancelTarget(order);
  };

  const handleConfirmCancel = async (reason: string) => {
    if (!cancelTarget) return;

    setIsCancelling(true);

    try {
      const updated = await orderService.cancelOrder(cancelTarget._id, reason);
      setOrders((current) =>
        current.map((item) => (item._id === updated._id ? updated : item))
      );
      toast.success(`Order ${cancelTarget.orderNumber} cancelled`);
      setCancelTarget(null);
      // Keep the active status filter consistent with the new order state.
      void loadOrders();
    } catch (cancelError) {
      toast.error(
        getApiErrorMessage(cancelError, "Could not cancel this order.")
      );
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--color-ink-muted)]">
            Order history
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-2xl">
            My orders
          </h2>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
            {total > 0
              ? `${total} order${total === 1 ? "" : "s"} placed with ClassyShop.`
              : "Track every order from checkout to delivery."}
          </p>
        </div>

        <Link
          to="/collections/all"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-primary)]"
        >
          Continue shopping
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="better-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {STATUS_TABS.map((tab) => {
          const active = statusFilter === tab.value;

          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => handleStatusChange(tab.value)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                  : "border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-ink-soft)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <OrderSkeleton />
          <OrderSkeleton />
        </div>
      ) : error ? (
        <div className="card-padded flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
            <AlertCircle className="h-5 w-5" />
          </span>
          <p className="mt-4 text-sm font-medium text-[var(--color-ink)]">
            {error}
          </p>
          <button
            type="button"
            onClick={() => void loadOrders()}
            className="btn-outline mt-5"
          >
            Try again
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="card-padded flex flex-col items-center px-6 py-14 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
            <ShoppingBag className="h-7 w-7" />
          </span>
          <h3 className="mt-5 text-lg font-semibold text-[var(--color-ink)]">
            {statusFilter === "all"
              ? "No orders yet"
              : `No ${statusFilter.toLowerCase()} orders`}
          </h3>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--color-ink-soft)]">
            {statusFilter === "all"
              ? "When you place your first order, it will appear here with live tracking and payment updates."
              : "Try another status filter to see the rest of your order history."}
          </p>
          {statusFilter === "all" && (
            <Link
              to="/collections/all"
              className="checkout-primary-button mt-6 max-w-xs"
            >
              Start shopping
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const payment = PAYMENT_STATUS_META[order.paymentStatus];
            const itemsCount = getOrderItemsCount(order.orderItems);
            const canCancel = order.orderStatus === "Processing";
            const previewItems = order.orderItems.slice(0, 4);
            const hiddenCount = order.orderItems.length - previewItems.length;

            return (
              <article
                key={order._id}
                className="card-container transition-shadow hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]/40 px-5 py-4 sm:px-6">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="text-sm font-semibold text-[var(--color-ink)]">
                      {order.orderNumber}
                    </span>
                    <span className="text-xs text-[var(--color-ink-soft)]">
                      Placed {formatOrderDate(order.createdAt)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`status-badge ${ORDER_STATUS_CLASSES[order.orderStatus]}`}
                    >
                      {order.orderStatus === "Shipped" && (
                        <Truck className="h-3.5 w-3.5" />
                      )}
                      {order.orderStatus === "Delivered" && (
                        <Package className="h-3.5 w-3.5" />
                      )}
                      {order.orderStatus === "Cancelled" && (
                        <XCircle className="h-3.5 w-3.5" />
                      )}
                      {order.orderStatus}
                    </span>
                    <span className={`status-badge ${payment.className}`}>
                      {payment.label}
                    </span>
                  </div>
                </div>

                {order.orderStatus === "Cancelled" && (
                  <div className="flex items-start gap-2.5 border-b border-red-100 bg-red-50/70 px-5 py-3 text-xs leading-relaxed text-red-700 sm:px-6">
                    <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <p>
                      <span className="font-semibold">
                        Cancellation reason:
                      </span>{" "}
                      {order.cancelReason || "No reason was provided."}
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-5 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex -space-x-3">
                      {previewItems.map((item, index) => (
                        <Link
                          key={`${item.productId}-${item.size}-${item.color}-${index}`}
                          to={`/products/${item.productId}`}
                          className="relative h-16 w-14 shrink-0 overflow-hidden rounded-xl border-2 border-[var(--color-surface)] bg-[var(--color-surface-muted)]"
                          title={item.name}
                        >
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-[var(--color-ink-muted)]">
                              <ShoppingBag className="h-4 w-4" />
                            </span>
                          )}
                        </Link>
                      ))}
                      {hiddenCount > 0 && (
                        <span className="relative flex h-16 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--color-surface)] bg-[var(--color-surface-muted)] text-xs font-semibold text-[var(--color-ink-soft)]">
                          +{hiddenCount}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--color-ink)]">
                        {order.orderItems[0]?.name || "Order items"}
                        {order.orderItems.length > 1 &&
                          ` + ${order.orderItems.length - 1} more`}
                      </p>
                      <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
                        {itemsCount} item{itemsCount === 1 ? "" : "s"} ·{" "}
                        {order.shippingAddress.city},{" "}
                        {order.shippingAddress.country}
                      </p>
                      <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                        Cash on delivery
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
                    <div className="text-left sm:text-right">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-ink-muted)]">
                        Order total
                      </p>
                      <p className="text-lg font-semibold text-[var(--color-ink)]">
                        {formatMoney(order.totalPrice)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {canCancel && (
                        <button
                          type="button"
                          onClick={() => handleCancel(order)}
                          disabled={isCancelling && cancelTarget?._id === order._id}
                          className="rounded-xl border border-[var(--color-border-strong)] px-3 py-2 text-xs font-semibold text-[var(--color-ink-soft)] transition-colors hover:border-[var(--color-danger)] hover:text-[var(--color-danger)] disabled:opacity-50"
                        >
                          {isCancelling && cancelTarget?._id === order._id
                            ? "Cancelling…"
                            : "Cancel"}
                        </button>
                      )}
                      <Link
                        to={`/order/${order._id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)]"
                      >
                        View details
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}

          {pages > 1 && (
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                className="btn-outline inline-flex items-center gap-1.5 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <span className="text-xs font-medium text-[var(--color-ink-soft)]">
                Page {page} of {pages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setPage((current) => Math.min(pages, current + 1))
                }
                disabled={page >= pages}
                className="btn-outline inline-flex items-center gap-1.5 disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      <CancelOrderDialog
        open={cancelTarget !== null}
        orderNumber={cancelTarget?.orderNumber}
        isSubmitting={isCancelling}
        onClose={() => {
          if (!isCancelling) setCancelTarget(null);
        }}
        onConfirm={handleConfirmCancel}
      />
    </section>
  );
};

export default MyOrders;
