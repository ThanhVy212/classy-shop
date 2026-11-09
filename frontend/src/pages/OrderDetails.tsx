import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Clock,
  CreditCard,
  Mail,
  MapPin,
  Package,
  Printer,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Truck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../hooks/useAuth.ts";
import OptimizedImage from "../components/Common/OptimizedImage.tsx";
import CancelOrderDialog from "../components/Orders/CancelOrderDialog";
import { orderService } from "../services/orderService.ts";
import type {
  Order,
  OrderStatus,
  PaymentStatus,
} from "../types/order.ts";
import {
  formatMoney,
  formatOrderDate,
  formatOrderDateTime,
  getOrderItemsCount,
  getPaymentMethodLabel,
  getShippingMethodLabel,
  getTrackingSteps,
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_CLASSES,
  PAYMENT_STATUS_META,
} from "../utils/order.ts";
import { getApiErrorMessage } from "../utils/apiError.ts";
import { getColorStyle } from "../utils/colors.ts";
import Button from "../components/Common/Button.tsx";
import { OrderDetailsSkeleton } from "../components/Common/Skeletons.tsx";

const PAYMENT_STATUSES: PaymentStatus[] = [
  "pending",
  "paid",
  "failed",
  "refunded",
];

const OrderDetails = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { isAdmin } = useAuth();

  const isAdminView = location.pathname.startsWith("/admin");
  const justPlaced = Boolean(
    (location.state as { justPlaced?: boolean } | null)?.justPlaced
  );

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [statusDraft, setStatusDraft] = useState<OrderStatus>("Processing");
  const [paymentDraft, setPaymentDraft] =
    useState<PaymentStatus>("pending");
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!id) {
      setOrder(null);
      setError("Order not found.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await orderService.getOrderById(id);
      setOrder(data);
      setStatusDraft(data.orderStatus);
      setPaymentDraft(data.paymentStatus);
    } catch (loadError) {
      setOrder(null);
      setError(
        getApiErrorMessage(loadError, "We couldn't find this order.")
      );
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  const handleCancel = () => {
    if (!order) return;
    setIsCancelDialogOpen(true);
  };

  const handleConfirmCancel = async (reason: string) => {
    if (!order) return;

    setIsCancelling(true);

    try {
      const updated = isAdminView
        ? await orderService.updateOrderStatus(order._id, "Cancelled", reason)
        : await orderService.cancelOrder(order._id, reason);

      setOrder(updated);
      setStatusDraft(updated.orderStatus);
      setPaymentDraft(updated.paymentStatus);
      setIsCancelDialogOpen(false);
      toast.success(`Order ${order.orderNumber} cancelled`);
    } catch (cancelError) {
      toast.error(
        getApiErrorMessage(cancelError, "Could not cancel this order.")
      );
    } finally {
      setIsCancelling(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!order || statusDraft === order.orderStatus) return;

    if (statusDraft === "Cancelled") {
      setIsCancelDialogOpen(true);
      return;
    }

    setIsSavingStatus(true);

    try {
      const updated = await orderService.updateOrderStatus(
        order._id,
        statusDraft
      );
      setOrder(updated);
      setStatusDraft(updated.orderStatus);
      setPaymentDraft(updated.paymentStatus);
      toast.success(
        `Fulfilment status updated to ${ORDER_STATUS_LABELS[updated.orderStatus]}`
      );
    } catch (updateError) {
      toast.error(
        getApiErrorMessage(updateError, "Could not update the order status.")
      );
    } finally {
      setIsSavingStatus(false);
    }
  };

  const handlePaymentUpdate = async () => {
    if (!order || paymentDraft === order.paymentStatus) return;

    setIsSavingPayment(true);

    try {
      const updated = await orderService.updatePaymentStatus(
        order._id,
        paymentDraft
      );
      setOrder(updated);
      setStatusDraft(updated.orderStatus);
      setPaymentDraft(updated.paymentStatus);
      toast.success(`Payment status updated to ${updated.paymentStatus}`);
    } catch (updateError) {
      toast.error(
        getApiErrorMessage(
          updateError,
          "Could not update the payment status."
        )
      );
    } finally {
      setIsSavingPayment(false);
    }
  };

  if (isLoading) {
    return <OrderDetailsSkeleton />;
  }

  if (!order) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="card-padded max-w-md text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-surface-muted)] text-[var(--color-ink-muted)]">
            <Package className="h-7 w-7" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold text-[var(--color-ink)]">
            Order not found
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-soft)]">
            {error ||
              "We couldn't locate this order. It may have been removed or belongs to another account."}
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              to={isAdminView ? "/admin/orders" : "/profile"}
              className="btn-outline"
            >
              Back to orders
            </Link>
            <Link to="/collections/all" className="btn-black rounded-xl px-4 py-2.5 text-sm font-semibold">
              Continue shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const payment = PAYMENT_STATUS_META[order.paymentStatus];
  const itemsCount = getOrderItemsCount(order.orderItems);
  const steps = getTrackingSteps(order.orderStatus, order.isDelivered, {
    createdAt: order.createdAt,
    deliveredAt: order.deliveredAt,
    statusHistory: order.statusHistory,
  });
  const canCustomerCancel =
    !isAdminView && order.orderStatus === "Processing";
  const isCancelled = order.orderStatus === "Cancelled";

  return (
    <div
      className={
        isAdminView
          ? "space-y-6"
          : "min-h-screen bg-[var(--color-canvas)] px-4 py-8 sm:px-6 sm:py-10 lg:px-8"
      }
    >
      <div className="mx-auto w-full max-w-6xl">
        {/* Back + actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to={isAdminView ? "/admin/orders" : "/profile"}
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-primary)]"
          >
            <ArrowLeft className="h-4 w-4" />
            {isAdminView ? "All orders" : "My orders"}
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-xs font-semibold text-[var(--color-ink-soft)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] print:hidden"
            >
              <Printer className="h-3.5 w-3.5" />
              Print invoice
            </button>
            {canCustomerCancel && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={isCancelling}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-xs font-semibold text-[var(--color-ink-soft)] transition-colors hover:border-[var(--color-danger)] hover:text-[var(--color-danger)] disabled:opacity-50 print:hidden"
              >
                <XCircle className="h-3.5 w-3.5" />
                {isCancelling ? "Cancelling…" : "Cancel order"}
              </button>
            )}
          </div>
        </div>

        {justPlaced && !isCancelled && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[var(--color-success)]/30 bg-[var(--color-primary-soft)] px-5 py-4 text-sm text-[var(--color-primary)]">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Thank you — your order is confirmed.</p>
              <p className="mt-0.5 text-xs leading-relaxed">
                We've reserved your pieces. Pay in cash when the courier hands
                over your parcel.
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="checkout-card mt-5 overflow-hidden">
          <div className="flex flex-col gap-5 p-6 sm:p-8 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--color-ink-muted)]">
                Order
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-3xl">
                  {order.orderNumber}
                </h1>
                <span
                  className={`status-badge ${ORDER_STATUS_CLASSES[order.orderStatus]}`}
                >
                  {ORDER_STATUS_LABELS[order.orderStatus]}
                </span>
                <span className={`status-badge ${payment.className}`}>
                  {payment.label}
                </span>
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--color-ink-soft)]">
                <Clock className="h-3.5 w-3.5" />
                Placed {formatOrderDateTime(order.createdAt)}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--color-ink-soft)]">
                <Mail className="h-3.5 w-3.5" />
                {order.contactEmail}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 px-5 py-4 text-left lg:text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
                Order total
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-3xl">
                {formatMoney(order.totalPrice)}
              </p>
              <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
                {itemsCount} item{itemsCount === 1 ? "" : "s"} ·{" "}
                {getPaymentMethodLabel(order.paymentMethod)}
              </p>
            </div>
          </div>

          {/* Tracking */}
          <div className="border-t border-[var(--color-border)] px-6 py-6 sm:px-8">
            {isCancelled && (
              <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-relaxed text-red-700">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-semibold">
                    This order was cancelled
                    {order.cancelledAt
                      ? ` on ${formatOrderDateTime(order.cancelledAt)}`
                      : ""}
                    .
                  </p>
                  <p className="mt-1">
                    <span className="font-semibold">Reason:</span>{" "}
                    {order.cancelReason || "No reason was provided."}
                  </p>
                  <p className="mt-1">
                    Any reserved stock has been released.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {steps.map((step, index) => {
                const Icon =
                  step.key === "placed"
                    ? CheckCircle2
                    : step.key === "shipped"
                      ? Truck
                      : step.key === "delivered"
                        ? Package
                        : CreditCard;
                const isCurrent =
                  step.done && !steps[index + 1]?.done && !isCancelled;

                return (
                  <div
                    key={step.key}
                    className="flex flex-col items-center text-center"
                  >
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-full border ${
                        step.cancelled
                          ? "border-red-200 bg-red-50 text-red-500"
                          : step.done
                            ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                            : "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-ink-muted)]"
                      } ${isCurrent ? "ring-4 ring-[var(--color-primary-soft)]" : ""}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span
                      className={`mt-2.5 text-xs font-semibold ${
                        step.done
                          ? "text-[var(--color-ink)]"
                          : "text-[var(--color-ink-muted)]"
                      }`}
                    >
                      {step.label}
                    </span>
                    <span className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
                      {step.cancelled
                        ? "Cancelled"
                        : step.done
                          ? "Completed"
                          : "Pending"}
                    </span>
                    {step.done && !step.cancelled && step.completedAt && (
                      <span className="mt-1 text-[10px] font-medium text-[var(--color-ink-muted)]">
                        {formatOrderDate(step.completedAt)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
          {/* Items + info */}
          <div className="space-y-6 lg:col-span-2">
            <section className="card-container">
              <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4 sm:px-6">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                    <ShoppingBag className="h-4 w-4" />
                  </span>
                  <h2 className="text-sm font-semibold text-[var(--color-ink)]">
                    Items in this order
                  </h2>
                </div>
                <span className="badge-counter">
                  {itemsCount} item{itemsCount === 1 ? "" : "s"}
                </span>
              </div>

              <div className="divide-y divide-[var(--color-border)]">
                {order.orderItems.map((item, index) => (
                  <div
                    key={`${item.productId}-${item.size}-${item.color}-${index}`}
                    className="flex items-center gap-4 px-5 py-4 sm:px-6"
                  >
                    <Link
                      to={`/products/${item.productId}`}
                      className="h-20 w-16 shrink-0 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]"
                    >
                      {item.image ? (
                        <OptimizedImage
                          src={item.image}
                          alt={item.name}
                          widths={[64, 96, 128]}
                          sizes="64px"
                          crop="fill"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-[var(--color-ink-muted)]">
                          <ShoppingBag className="h-5 w-5" />
                        </span>
                      )}
                    </Link>

                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/products/${item.productId}`}
                        className="block truncate text-sm font-semibold text-[var(--color-ink)] transition-colors hover:text-[var(--color-primary)]"
                      >
                        {item.name}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-ink-soft)]">
                        {item.size && (
                          <span>
                            Size{" "}
                            <span className="font-medium text-[var(--color-ink)]">
                              {item.size}
                            </span>
                          </span>
                        )}
                        {item.color && (
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full border border-[var(--color-border-strong)]"
                              style={getColorStyle(item.color)}
                            />
                            {item.color}
                          </span>
                        )}
                        <span>
                          Qty{" "}
                          <span className="font-medium text-[var(--color-ink)]">
                            {item.quantity}
                          </span>
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                        {formatMoney(item.price)} each
                      </p>
                    </div>

                    <p className="shrink-0 text-sm font-semibold text-[var(--color-ink)]">
                      {formatMoney(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Shipping */}
              <section className="card-padded">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <h2 className="text-sm font-semibold text-[var(--color-ink)]">
                    Delivery details
                  </h2>
                </div>

                <div className="mt-4 space-y-3 text-sm">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-muted)]">
                      Recipient
                    </p>
                    <p className="mt-0.5 font-medium text-[var(--color-ink)]">
                      {order.shippingAddress.fullName}
                    </p>
                    <p className="text-xs text-[var(--color-ink-soft)]">
                      {order.shippingAddress.phone}
                    </p>
                  </div>

                  <div className="border-t border-[var(--color-border)] pt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-muted)]">
                      Address
                    </p>
                    <p className="mt-0.5 text-sm leading-relaxed text-[var(--color-ink)]">
                      {order.shippingAddress.address}
                      {order.shippingAddress.apartment && (
                        <>, {order.shippingAddress.apartment}</>
                      )}
                      <br />
                      {order.shippingAddress.city},{" "}
                      {order.shippingAddress.postalCode}
                      <br />
                      {order.shippingAddress.country}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-muted)]">
                        Method
                      </p>
                      <p className="mt-0.5 text-sm font-medium text-[var(--color-ink)]">
                        {getShippingMethodLabel(order.shippingMethod)}
                      </p>
                    </div>
                    <span className="status-badge status-badge-neutral">
                      {order.isDelivered ? "Received" : "In progress"}
                    </span>
                  </div>
                </div>
              </section>

              {/* Payment */}
              <section className="card-padded">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                    <Banknote className="h-4 w-4" />
                  </span>
                  <h2 className="text-sm font-semibold text-[var(--color-ink)]">
                    Payment
                  </h2>
                </div>

                <div className="mt-4 space-y-3 text-sm">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-muted)]">
                      Method
                    </p>
                    <p className="mt-0.5 font-medium text-[var(--color-ink)]">
                      {getPaymentMethodLabel(order.paymentMethod)}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--color-ink-soft)]">
                      Pay in cash when your order is delivered.
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-muted)]">
                        Status
                      </p>
                      <p className="mt-0.5 text-sm font-medium text-[var(--color-ink)]">
                        {payment.label}
                      </p>
                      {order.paidAt && (
                        <p className="text-[11px] text-[var(--color-ink-muted)]">
                          {formatOrderDateTime(order.paidAt)}
                        </p>
                      )}
                    </div>
                    <span className={`status-badge ${payment.className}`}>
                      {order.isPaid ? "Settled" : "On delivery"}
                    </span>
                  </div>
                </div>
              </section>
            </div>

            {/* Admin controls */}
            {isAdminView && isAdmin && (
              <section className="card-padded">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--color-ink)]">
                      Manage order
                    </h2>
                    <p className="text-xs text-[var(--color-ink-soft)]">
                      Update fulfilment and payment states.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="fulfilment-status"
                      className="form-label"
                    >
                      Fulfilment status
                    </label>
                    <select
                      id="fulfilment-status"
                      value={statusDraft}
                      onChange={(event) =>
                        setStatusDraft(event.target.value as OrderStatus)
                      }
                      className="form-select"
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
                          {ORDER_STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      onClick={() => void handleStatusUpdate()}
                      disabled={
                        isSavingStatus ||
                        statusDraft === order.orderStatus ||
                        isCancelled
                      }
                      className="btn-black mt-3 w-full rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
                    >
                      {isSavingStatus ? "Saving…" : "Update status"}
                    </Button>
                  </div>

                  <div>
                    <label htmlFor="payment-status" className="form-label">
                      Payment status
                    </label>
                    <select
                      id="payment-status"
                      value={paymentDraft}
                      onChange={(event) =>
                        setPaymentDraft(event.target.value as PaymentStatus)
                      }
                      className="form-select"
                    >
                      {PAYMENT_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {PAYMENT_STATUS_META[status].label}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      onClick={() => void handlePaymentUpdate()}
                      disabled={
                        isSavingPayment || paymentDraft === order.paymentStatus
                      }
                      className="btn-outline mt-3 w-full"
                    >
                      {isSavingPayment
                        ? "Saving…"
                        : "Update payment"}
                    </Button>
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Summary + history */}
          <aside className="space-y-6">
            <section className="card-padded">
              <h2 className="card-title">Order summary</h2>

              <div className="mt-5 space-y-2.5 text-sm">
                <div className="flex items-center justify-between text-[var(--color-ink-soft)]">
                  <span>Subtotal ({itemsCount} items)</span>
                  <span className="font-medium text-[var(--color-ink)]">
                    {formatMoney(order.itemsPrice)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[var(--color-ink-soft)]">
                  <span>
                    Shipping · {getShippingMethodLabel(order.shippingMethod)}
                  </span>
                  <span className="font-medium text-[var(--color-ink)]">
                    {order.shippingPrice === 0
                      ? "Free"
                      : formatMoney(order.shippingPrice)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[var(--color-ink-soft)]">
                  <span>Tax</span>
                  <span className="font-medium text-[var(--color-ink)]">
                    {formatMoney(order.taxPrice)}
                  </span>
                </div>

                {order.discountAmount > 0 && (
                  <div className="flex items-center justify-between text-[var(--color-success)]">
                    <span className="inline-flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5" />
                      Discount
                      {order.promoCode ? ` (${order.promoCode})` : ""}
                    </span>
                    <span className="font-medium">
                      −{formatMoney(order.discountAmount)}
                    </span>
                  </div>
                )}

                <div className="flex items-end justify-between border-t border-[var(--color-border)] pt-4">
                  <div>
                    <span className="block text-base font-semibold text-[var(--color-ink)]">
                      Total
                    </span>
                    <span className="text-[11px] text-[var(--color-ink-muted)]">
                      Taxes included · pay on delivery
                    </span>
                  </div>
                  <span className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
                    {formatMoney(order.totalPrice)}
                  </span>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <Link
                  to="/collections/all"
                  className="checkout-primary-button"
                >
                  Continue shopping
                </Link>
                <Link
                  to={isAdminView ? "/admin/orders" : "/profile"}
                  className="btn-outline block w-full text-center"
                >
                  {isAdminView ? "Back to all orders" : "View all orders"}
                </Link>
              </div>
            </section>

            <section className="card-padded">
              <h2 className="card-title">Order timeline</h2>

              <ol className="mt-5 space-y-4">
                {[...order.statusHistory].reverse().map((event, index) => (
                  <li key={`${event.status}-${event.changedAt}-${index}`} className="flex gap-3">
                    <span
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                        index === 0
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                          : "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-ink-muted)]"
                      }`}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--color-ink)]">
                        {ORDER_STATUS_LABELS[event.status]}
                      </p>
                      <p className="text-[11px] text-[var(--color-ink-muted)]">
                        {formatOrderDateTime(event.changedAt)}
                      </p>
                      {event.note && (
                        <p className="mt-0.5 text-xs leading-relaxed text-[var(--color-ink-soft)]">
                          {event.note}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/60 p-5">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-ink-soft)]" />
                <div>
                  <h3 className="text-sm font-semibold text-[var(--color-ink)]">
                    Need assistance?
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--color-ink-soft)]">
                    Questions about delivery, sizing or a return? Our care team
                    is here to help.
                  </p>
                  <a
                    href="mailto:care@classyshop.com"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary)] underline underline-offset-2"
                  >
                    care@classyshop.com
                  </a>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <CancelOrderDialog
        open={isCancelDialogOpen}
        orderNumber={order.orderNumber}
        isSubmitting={isCancelling}
        onClose={() => {
          if (!isCancelling) {
            setIsCancelDialogOpen(false);
            if (isAdminView) {
              setStatusDraft(order.orderStatus);
            }
          }
        }}
        onConfirm={handleConfirmCancel}
      />
    </div>
  );
};

export default OrderDetails;
