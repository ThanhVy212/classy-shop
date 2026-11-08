import type { Product, ProductImage } from "../types/product";

const normalizeColor = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

/**
 * Images assigned to a specific color. Returns an empty array when the product
 * has no gallery for that color, so callers can fall back to the full gallery.
 */
export const getImagesForColor = (
  product: Pick<Product, "colorImages"> | null | undefined,
  color?: string | null,
): ProductImage[] => {
  if (!product || !Array.isArray(product.colorImages) || !color) return [];

  const colorKey = normalizeColor(color);
  if (!colorKey) return [];

  const entry = product.colorImages.find(
    (item) => normalizeColor(item?.color) === colorKey,
  );

  return (entry?.images ?? []).filter((image) => Boolean(image?.url));
};
