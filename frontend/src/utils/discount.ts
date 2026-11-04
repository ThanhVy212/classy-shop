import type { DiscountValidation } from "../types/discount";

export const calculateDiscountPreview = (
  discount: DiscountValidation | null,
  subtotal: number
): number => {
  if (!discount) return 0;

  const amount = Math.max(0, Number(subtotal) || 0);
  if (amount <= 0) return 0;

  const minimum = Number(discount.minOrderAmount);
  if (Number.isFinite(minimum) && minimum > 0 && amount < minimum) return 0;

  let value =
    discount.type === "percentage"
      ? amount * ((Number(discount.value) || 0) / 100)
      : Number(discount.value) || 0;

  if (
    discount.type === "percentage" &&
    discount.maxDiscountAmount != null &&
    Number(discount.maxDiscountAmount) > 0
  ) {
    value = Math.min(value, Number(discount.maxDiscountAmount));
  }

  return Math.round(Math.min(Math.max(value, 0), amount) * 100) / 100;
};
