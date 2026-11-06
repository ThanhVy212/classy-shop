import type { Product, ProductVariant } from "../types/product";

const normalizeValue = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

export const hasVariants = (
  product: Pick<Product, "variants"> | null | undefined,
): product is Pick<Product, "variants"> & { variants: ProductVariant[] } =>
  Array.isArray(product?.variants) && product.variants.length > 0;

export const variantKey = (size: unknown, color: unknown) =>
  `${normalizeValue(size)}::${normalizeValue(color)}`;

export const findVariant = (
  product: Pick<Product, "variants"> | null | undefined,
  size: string,
  color: string,
): ProductVariant | null => {
  if (!hasVariants(product)) return null;

  const key = variantKey(size, color);

  return (
    product.variants.find(
      (variant) => variantKey(variant.size, variant.color) === key,
    ) ?? null
  );
};

/**
 * Stock for a size/color pair. Legacy products without variants keep using the
 * product-level countInStock, matching the backend rule.
 */
export const getAvailableStock = (
  product: Pick<Product, "variants" | "countInStock"> | null | undefined,
  size: string,
  color: string,
): number => {
  if (!product) return 0;

  if (!hasVariants(product)) {
    return Math.max(0, Math.floor(Number(product.countInStock) || 0));
  }

  const variant = findVariant(product, size, color);

  return Math.max(0, Math.floor(Number(variant?.stock) || 0));
};

export const sumVariantStock = (variants: ProductVariant[] = []): number =>
  variants.reduce(
    (total, variant) =>
      total + Math.max(0, Math.floor(Number(variant.stock) || 0)),
    0,
  );

/**
 * Can the shopper still pick this size? When a color is supplied the check is
 * narrowed to that color, which lets the product page grey out a size that is
 * sold out in the currently selected color.
 */
export const isSizeAvailable = (
  product: Pick<Product, "variants" | "countInStock"> | null | undefined,
  size: string,
  color?: string,
): boolean => {
  if (!product) return false;

  if (!hasVariants(product)) {
    return Math.max(0, Math.floor(Number(product.countInStock) || 0)) > 0;
  }

  const sizeKey = normalizeValue(size);
  const colorKey = color === undefined ? null : normalizeValue(color);

  return product.variants.some(
    (variant) =>
      normalizeValue(variant.size) === sizeKey &&
      (colorKey === null || normalizeValue(variant.color) === colorKey) &&
      Math.floor(Number(variant.stock) || 0) > 0,
  );
};

/**
 * Same idea as isSizeAvailable, but for the color swatches.
 */
export const isColorAvailable = (
  product: Pick<Product, "variants" | "countInStock"> | null | undefined,
  color: string,
  size?: string,
): boolean => {
  if (!product) return false;

  if (!hasVariants(product)) {
    return Math.max(0, Math.floor(Number(product.countInStock) || 0)) > 0;
  }

  const colorKey = normalizeValue(color);
  const sizeKey = size === undefined ? null : normalizeValue(size);

  return product.variants.some(
    (variant) =>
      normalizeValue(variant.color) === colorKey &&
      (sizeKey === null || normalizeValue(variant.size) === sizeKey) &&
      Math.floor(Number(variant.stock) || 0) > 0,
  );
};

export const findFirstInStockVariant = (
  product: Pick<Product, "variants"> | null | undefined,
): ProductVariant | null => {
  if (!hasVariants(product)) return null;

  return (
    product.variants.find(
      (variant) => Math.floor(Number(variant.stock) || 0) > 0,
    ) ?? null
  );
};

/**
 * When the shopper picks a color that is sold out in the current size, the
 * product page jumps to a size that is actually available instead of dead
 * ending on a disabled combination.
 */
export const findAvailableSize = (
  product: Pick<Product, "variants"> | null | undefined,
  color: string,
): string | null => {
  if (!hasVariants(product)) return null;

  const colorKey = normalizeValue(color);
  const variant = product.variants.find(
    (item) =>
      normalizeValue(item.color) === colorKey &&
      Math.floor(Number(item.stock) || 0) > 0,
  );

  return variant?.size ?? null;
};

export const findAvailableColor = (
  product: Pick<Product, "variants"> | null | undefined,
  size: string,
): string | null => {
  if (!hasVariants(product)) return null;

  const sizeKey = normalizeValue(size);
  const variant = product.variants.find(
    (item) =>
      normalizeValue(item.size) === sizeKey &&
      Math.floor(Number(item.stock) || 0) > 0,
  );

  return variant?.color ?? null;
};



/**
 * True when every size/color combination the shopper can pick is sold out.
 * Used to disable the add-to-cart button even before a combo is selected.
 */
export const isProductSoldOut = (
  product: Pick<Product, "variants" | "countInStock"> | null | undefined,
): boolean => {
  if (!product) return true;

  if (!hasVariants(product)) {
    return Math.max(0, Math.floor(Number(product.countInStock) || 0)) === 0;
  }

  return product.variants.every(
    (variant) => Math.max(0, Math.floor(Number(variant.stock) || 0)) === 0,
  );
};
