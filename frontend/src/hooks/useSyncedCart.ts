import { useEffect, useMemo, useState } from "react";
import { useCart } from "./useCart";
import { productService } from "../services/productService";
import type { Product } from "../types/product";

export interface SyncedCartLine {
  productId: string;
  name: string;
  image: string;
  price: number;
  size: string;
  color: string;
  quantity: number;
  stock?: number;
  lineTotal: number;
  inStock: boolean;
}

interface SyncedCartResult {
  items: SyncedCartLine[];
  subtotal: number;
  savings: number;
  itemCount: number;
  isSyncing: boolean;
}

const getEffectivePrice = (
  product: Product | undefined,
  fallback?: number
): number => {
  const price = Number(product?.price);
  const discountPrice = Number(product?.discountPrice);

  if (
    Number.isFinite(discountPrice) &&
    discountPrice > 0 &&
    (!Number.isFinite(price) || discountPrice < price)
  ) {
    return discountPrice;
  }

  if (Number.isFinite(price) && price > 0) {
    return price;
  }

  const fallbackPrice = Number(fallback);
  return Number.isFinite(fallbackPrice) && fallbackPrice > 0
    ? fallbackPrice
    : 0;
};

/**
 * Hydrates cart lines with the latest product data (name, image, price and
 * stock) from the product API. Falls back to the cart snapshot for any product
 * that cannot be fetched.
 */
export const useSyncedCart = (): SyncedCartResult => {
  const { items: cartItems } = useCart();
  const [syncedProducts, setSyncedProducts] = useState<Record<string, Product>>(
    {}
  );
  const [isSyncing, setIsSyncing] = useState(false);

  const productIdsKey = useMemo(
    () =>
      Array.from(
        new Set(
          cartItems
            .map((item) => item.productId)
            .filter((id): id is string => Boolean(id))
        )
      ).join("|"),
    [cartItems]
  );

  useEffect(() => {
    if (!productIdsKey) {
      setSyncedProducts({});
      setIsSyncing(false);
      return;
    }

    let cancelled = false;
    const productIds = productIdsKey.split("|");
    setIsSyncing(true);

    Promise.allSettled(
      productIds.map((productId) => productService.getProductById(productId))
    )
      .then((results) => {
        if (cancelled) return;

        const nextProducts: Record<string, Product> = {};
        results.forEach((result, index) => {
          if (result.status === "fulfilled" && result.value) {
            nextProducts[productIds[index]] = result.value;
          }
        });

        setSyncedProducts(nextProducts);
      })
      .finally(() => {
        if (!cancelled) setIsSyncing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [productIdsKey]);

  const items = useMemo<SyncedCartLine[]>(() => {
    return cartItems.map((item) => {
      const product = syncedProducts[item.productId];
      const quantity = Math.max(1, Number(item.quantity) || 1);
      const price = getEffectivePrice(product, item.price);
      const rawStock = Number(product?.countInStock);
      const stock = Number.isFinite(rawStock) ? rawStock : undefined;
      const image =
        product?.images?.[0]?.url || product?.image || item.image || "";

      return {
        productId: item.productId,
        name: product?.name?.trim() || item.name,
        image,
        price,
        size: item.size,
        color: item.color,
        quantity,
        stock,
        lineTotal: price * quantity,
        inStock: stock === undefined || stock > 0,
      };
    });
  }, [cartItems, syncedProducts]);

  const subtotal = useMemo(
    () => items.reduce((total, item) => total + item.lineTotal, 0),
    [items]
  );

  const savings = useMemo(
    () =>
      items.reduce((total, item) => {
        const product = syncedProducts[item.productId];
        const basePrice = Number(product?.price);
        if (
          !product ||
          !Number.isFinite(basePrice) ||
          basePrice <= item.price
        ) {
          return total;
        }
        return total + (basePrice - item.price) * item.quantity;
      }, 0),
    [items, syncedProducts]
  );

  const itemCount = useMemo(
    () => items.reduce((total, item) => total + item.quantity, 0),
    [items]
  );

  return { items, subtotal, savings, itemCount, isSyncing };
};

export default useSyncedCart;
