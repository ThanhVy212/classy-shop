import React, { useCallback, useEffect, useState } from "react";
import type { WishlistItem, WishlistProduct } from "../types/wishlist";
import { wishlistService } from "../services/wishlistService";
import { useAuth } from "../hooks/useAuth";
import { WishlistContext } from "./wishlist-context";

const GUEST_WISHLIST_KEY = "classyshop_wishlist";
const MAX_GUEST_ITEMS = 100;

const isValidItem = (value: unknown): value is WishlistItem => {
  if (!value || typeof value !== "object") return false;

  const item = value as Partial<WishlistItem>;

  return (
    typeof item.productId === "string" &&
    item.productId.length > 0 &&
    !!item.product &&
    typeof item.product === "object" &&
    typeof item.product._id === "string" &&
    typeof item.product.name === "string" &&
    typeof item.product.price === "number"
  );
};

/**
 * Guests get a durable wishlist in localStorage, mirroring how the guest cart
 * works. It is merged into the account on the next sign-in and then cleared so
 * another account on the same device never inherits it.
 */
const readGuestWishlist = (): WishlistItem[] => {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(GUEST_WISHLIST_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const seen = new Set<string>();
    const items: WishlistItem[] = [];

    for (const value of parsed) {
      if (!isValidItem(value) || seen.has(value.productId)) continue;
      seen.add(value.productId);
      items.push(value);
      if (items.length >= MAX_GUEST_ITEMS) break;
    }

    return items;
  } catch {
    return [];
  }
};

const writeGuestWishlist = (items: WishlistItem[]): void => {
  if (typeof window === "undefined") return;

  try {
    if (items.length === 0) {
      window.localStorage.removeItem(GUEST_WISHLIST_KEY);
    } else {
      window.localStorage.setItem(
        GUEST_WISHLIST_KEY,
        JSON.stringify(items.slice(0, MAX_GUEST_ITEMS)),
      );
    }
  } catch {
    // Storage can be unavailable (private mode, quota). The in-memory state
    // still works for the current tab.
  }
};

const clearGuestWishlist = (): void => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(GUEST_WISHLIST_KEY);
  } catch {
    // Ignore storage errors.
  }
};

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>(() =>
    readGuestWishlist(),
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (authLoading) return;

    let isActive = true;
    setIsLoading(true);

    const loadWishlist = async () => {
      try {
        if (isAuthenticated) {
          const guestItems = readGuestWishlist();
          const next =
            guestItems.length > 0
              ? await wishlistService.merge(
                  guestItems.map((item) => item.productId),
                )
              : await wishlistService.getWishlist();

          // Only drop the guest copy once the server confirmed the merge.
          if (guestItems.length > 0) clearGuestWishlist();
          if (isActive) setItems(next);
        } else if (isActive) {
          setItems(readGuestWishlist());
        }
      } catch (error) {
        console.warn("Failed to load wishlist:", error);
        if (isActive) {
          setItems(isAuthenticated ? [] : readGuestWishlist());
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    void loadWishlist();

    return () => {
      isActive = false;
    };
  }, [authLoading, isAuthenticated]);

  const isWishlisted = useCallback(
    (productId: string) =>
      items.some((item) => item.productId === String(productId)),
    [items],
  );

  const toggleWishlist = useCallback(
    async (product: WishlistProduct): Promise<boolean> => {
      if (!product?._id) return false;

      const productId = String(product._id);
      const currentlyWishlisted = items.some(
        (item) => item.productId === productId,
      );

      if (isAuthenticated) {
        const next = currentlyWishlisted
          ? await wishlistService.remove(productId)
          : await wishlistService.add(productId);
        setItems(next);
        return !currentlyWishlisted;
      }

      setItems((current) => {
        const next = currentlyWishlisted
          ? current.filter((item) => item.productId !== productId)
          : [
              {
                productId,
                addedAt: new Date().toISOString(),
                product,
              },
              ...current,
            ].slice(0, MAX_GUEST_ITEMS);

        writeGuestWishlist(next);
        return next;
      });

      return !currentlyWishlisted;
    },
    [isAuthenticated, items],
  );

  const removeFromWishlist = useCallback(
    async (productId: string): Promise<void> => {
      const normalizedId = String(productId);

      if (isAuthenticated) {
        const next = await wishlistService.remove(normalizedId);
        setItems(next);
        return;
      }

      setItems((current) => {
        const next = current.filter((item) => item.productId !== normalizedId);
        writeGuestWishlist(next);
        return next;
      });
    },
    [isAuthenticated],
  );

  const clearWishlist = useCallback(async (): Promise<void> => {
    if (isAuthenticated) {
      const next = await wishlistService.clear();
      setItems(next);
      return;
    }

    clearGuestWishlist();
    setItems([]);
  }, [isAuthenticated]);

  const refreshWishlist = useCallback(async (): Promise<void> => {
    if (!isAuthenticated) {
      setItems(readGuestWishlist());
      return;
    }

    setItems(await wishlistService.getWishlist());
  }, [isAuthenticated]);

  return (
    <WishlistContext.Provider
      value={{
        items,
        count: items.length,
        isLoading,
        isWishlisted,
        toggleWishlist,
        removeFromWishlist,
        clearWishlist,
        refreshWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export default WishlistProvider;
