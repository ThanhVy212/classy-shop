import type { OrderStatus, PaymentStatus } from "../types/order";

export const ORDER_STATUSES: OrderStatus[] = [
  "Processing",
  "Shipped",
  "Delivered",
  "Cancelled",
];

export const ORDER_STATUS_CLASSES: Record<OrderStatus, string> = {
  Processing: "bg-amber-50 text-amber-700 border-amber-200",
  Shipped: "bg-blue-50 text-blue-700 border-blue-200",
  Delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Cancelled: "bg-red-50 text-red-700 border-red-200",
};

export const PAYMENT_STATUS_META: Record<
  PaymentStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Payment pending",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  paid: {
    label: "Paid",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  failed: {
    label: "Payment failed",
    className: "bg-red-50 text-red-700 border-red-200",
  },
  refunded: {
    label: "Refunded",
    className: "bg-neutral-100 text-neutral-600 border-neutral-200",
  },
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export const formatMoney = (value: number | undefined | null) =>
  currencyFormatter.format(Number(value) || 0);

export const formatOrderDate = (value: string | Date) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const formatOrderDateTime = (value: string | Date) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const getOrderItemsCount = (
  items: { quantity: number }[] | undefined
) => (items ?? []).reduce((total, item) => total + (item.quantity || 0), 0);

export const getPaymentMethodLabel = (method: string) =>
  method === "COD" ? "Cash on delivery" : method;

export const getShippingMethodLabel = (method: string) =>
  method === "express" ? "Express priority" : "Standard delivery";

/** Timeline steps shown on the order details page. */
export const getTrackingSteps = (
  status: OrderStatus,
  isDelivered: boolean
) => {
  const cancelled = status === "Cancelled";
  const shipped = status === "Shipped" || status === "Delivered" || isDelivered;
  const delivered = status === "Delivered" || isDelivered;

  return [
    { key: "placed", label: "Order placed", done: true, cancelled: false },
    {
      key: "processing",
      label: "Processing",
      done: !cancelled && (status === "Processing" || shipped),
      cancelled,
    },
    { key: "shipped", label: "Shipped", done: shipped && !cancelled, cancelled },
    {
      key: "delivered",
      label: "Delivered",
      done: delivered && !cancelled,
      cancelled,
    },
  ];
};
