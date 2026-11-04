import DiscountCode from "../models/DiscountCode.js";

export const roundMoney = (value) =>
  Math.round((Number(value) || 0) * 100) / 100;

export const normalizeDiscountCode = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();

export const getMinimumOrderAmount = (discount) => {
  const minimum = Number(discount?.minOrderAmount);

  return Number.isFinite(minimum) && minimum > 0 ? minimum : 0;
};

export const meetsMinimumOrder = (discount, subtotal) => {
  const minimum = getMinimumOrderAmount(discount);

  return minimum === 0 || Number(subtotal) >= minimum;
};

/**
 * Calculate the money amount a discount removes from an order subtotal.
 * Percentage discounts can optionally be capped with maxDiscountAmount.
 */
export const calculateDiscountAmount = (discount, subtotal) => {
  const amount = Math.max(0, Number(subtotal) || 0);

  if (!discount || amount <= 0 || !meetsMinimumOrder(discount, amount)) {
    return 0;
  }

  let discountValue = 0;

  if (discount.type === "percentage") {
    discountValue = amount * ((Number(discount.value) || 0) / 100);

    const cap = Number(discount.maxDiscountAmount);
    if (Number.isFinite(cap) && cap > 0) {
      discountValue = Math.min(discountValue, cap);
    }
  } else {
    discountValue = Number(discount.value) || 0;
  }

  return roundMoney(Math.min(Math.max(discountValue, 0), amount));
};

export const findDiscountByCode = (rawCode, { activeOnly = false } = {}) => {
  const code = normalizeDiscountCode(rawCode);

  if (!code) return null;

  const query = { code };
  if (activeOnly) query.isActive = true;

  return DiscountCode.findOne(query);
};

export const validateDiscountCode = async (rawCode, subtotal) => {
  const code = normalizeDiscountCode(rawCode);

  if (!code) {
    return { error: "Enter a discount code." };
  }

  const discount = await findDiscountByCode(code, { activeOnly: true });

  if (!discount) {
    return { error: "That discount code is invalid or has expired." };
  }

  if (!meetsMinimumOrder(discount, subtotal)) {
    return {
      error: `This discount code requires a minimum order of $${getMinimumOrderAmount(
        discount,
      ).toFixed(2)}.`,
    };
  }

  const discountAmount = calculateDiscountAmount(discount, subtotal);

  if (discountAmount <= 0) {
    return {
      error: "This discount code cannot be applied to your current order.",
    };
  }

  return {
    discount: {
      _id: discount._id,
      code: discount.code,
      description: discount.description,
      type: discount.type,
      value: discount.value,
      maxDiscountAmount: discount.maxDiscountAmount,
      minOrderAmount: discount.minOrderAmount,
      discountAmount,
    },
  };
};

export const recordDiscountUsage = async (discountId) => {
  if (!discountId) return;

  await DiscountCode.updateOne({ _id: discountId }, { $inc: { usageCount: 1 } });
};

/**
 * Create the original promo codes on a brand-new database so existing
 * storefront references keep working. Admins can edit or remove them later.
 */
export const ensureDefaultDiscountCodes = async () => {
  const isEnabled = (flag) => {
    if (!flag) return false;
    const normalized = String(flag).trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
  };

  const shouldSeed =
    isEnabled(process.env.SEED_DEFAULT_DISCOUNT_CODES) ||
    isEnabled(process.env.SEED_DISCOUNT_CODES) ||
    isEnabled(process.env.SEED_DEFAULT_DISCOUNTS) ||
    isEnabled(process.env.SEED_DISCOUNTS);

  if (!shouldSeed) return;

  const existingCount = await DiscountCode.countDocuments();

  if (existingCount > 0) return;

  await DiscountCode.insertMany([
    {
      code: "CLASSY10",
      description: "10% off your order",
      type: "percentage",
      value: 10,
    },
    {
      code: "WELCOME15",
      description: "15% off for new customers",
      type: "percentage",
      value: 15,
    },
  ]);
};
