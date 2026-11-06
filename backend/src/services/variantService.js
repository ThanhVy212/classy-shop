const MAX_VARIANTS = 200;

const normalizeValue = (value) => String(value ?? "").trim().toLowerCase();

const createValidationError = (message) => {
  const error = new Error(message);
  error.status = 400;
  return error;
};

export const hasVariants = (product) =>
  Array.isArray(product?.variants) && product.variants.length > 0;

export const variantKey = (size, color) =>
  `${normalizeValue(size)}::${normalizeValue(color)}`;

export const findVariant = (product, size, color) => {
  if (!hasVariants(product)) return null;

  const key = variantKey(size, color);

  return (
    product.variants.find(
      (variant) => variantKey(variant.size, variant.color) === key,
    ) ?? null
  );
};

/**
 * Stock for a size/color pair. Products that have not been split into
 * variants keep using the product-level countInStock, so old catalog data and
 * the guest cart keep working without a migration.
 */
export const getAvailableStock = (product, size, color) => {
  if (!hasVariants(product)) {
    return Math.max(0, Math.floor(Number(product?.countInStock) || 0));
  }

  const variant = findVariant(product, size, color);

  return Math.max(0, Math.floor(Number(variant?.stock) || 0));
};

export const sumVariantStock = (variants = []) =>
  variants.reduce(
    (total, variant) => total + Math.max(0, Math.floor(Number(variant.stock) || 0)),
    0,
  );

/**
 * Validate and clean variants sent by the admin UI. Values are matched against
 * the product's size and color lists so a typo cannot create a variant that
 * customers can never select. Duplicate size/color pairs are merged.
 */
export const normalizeVariants = (rawVariants, sizes = [], colors = []) => {
  if (!Array.isArray(rawVariants)) {
    throw createValidationError("Variants must be an array.");
  }

  if (rawVariants.length > MAX_VARIANTS) {
    throw createValidationError(
      `A product can have at most ${MAX_VARIANTS} variants.`,
    );
  }

  const sizeMap = new Map(
    (Array.isArray(sizes) ? sizes : [])
      .map((size) => String(size ?? "").trim())
      .filter(Boolean)
      .map((size) => [normalizeValue(size), size]),
  );
  const colorMap = new Map(
    (Array.isArray(colors) ? colors : [])
      .map((color) => String(color ?? "").trim())
      .filter(Boolean)
      .map((color) => [normalizeValue(color), color]),
  );

  const seen = new Set();
  const variants = [];

  for (const rawVariant of rawVariants) {
    if (!rawVariant || typeof rawVariant !== "object") continue;

    const sizeKey = normalizeValue(rawVariant.size);
    const colorKey = normalizeValue(rawVariant.color);

    if (!sizeKey || !colorKey) {
      throw createValidationError(
        "Every variant needs a size and a color.",
      );
    }

    if (!sizeMap.has(sizeKey) || !colorMap.has(colorKey)) {
      throw createValidationError(
        `Variant "${rawVariant.size} / ${rawVariant.color}" uses a size or color that is not available on this product.`,
      );
    }

    const key = `${sizeKey}::${colorKey}`;
    if (seen.has(key)) continue;
    seen.add(key);

    variants.push({
      size: sizeMap.get(sizeKey),
      color: colorMap.get(colorKey),
      stock: Math.max(0, Math.floor(Number(rawVariant.stock) || 0)),
      sku: String(rawVariant.sku ?? "").trim(),
    });
  }

  return variants;
};
