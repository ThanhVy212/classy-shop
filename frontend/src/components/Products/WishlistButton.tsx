import { useState } from "react";
import type { MouseEvent } from "react";
import { Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useWishlist } from "../../hooks/useWishlist";
import type { WishlistProduct } from "../../types/wishlist";
import { getApiErrorMessage } from "../../utils/apiError";
import Button from "../Common/Button.tsx";

interface WishlistButtonProps {
  product: WishlistProduct;
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

/**
 * Heart toggle used on product cards and the product page. Stops the click
 * from bubbling so it can live inside a product <Link> without navigating.
 */
const WishlistButton = ({
  product,
  className = "",
  showLabel = false,
  size = "md",
}: WishlistButtonProps) => {
  const { isWishlisted, toggleWishlist } = useWishlist();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const active = isWishlisted(product._id);

  const handleClick = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      const nowWishlisted = await toggleWishlist(product);
      toast.success(
        nowWishlisted
          ? "Saved to your wishlist"
          : "Removed from your wishlist",
        { duration: 1800 },
      );
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, "Could not update your wishlist."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const iconClass =
    size === "sm" ? "h-4 w-4" : size === "lg" ? "h-5 w-5" : "h-[18px] w-[18px]";
  const boxClass =
    size === "sm" ? "h-8 w-8" : size === "lg" ? "h-[52px] w-[52px]" : "h-9 w-9";

  return (
    <Button
      type="button"
      onClick={(event) => void handleClick(event)}
      disabled={isSubmitting}
      aria-pressed={active}
      aria-label={active ? "Remove from wishlist" : "Save to wishlist"}
      title={active ? "Remove from wishlist" : "Save to wishlist"}
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-full border shadow-sm backdrop-blur transition-colors ${
        showLabel ? "h-9 px-3.5" : boxClass
      } ${
        active
          ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
          : "border-[var(--color-border-strong)] bg-[var(--color-surface)]/95 text-[var(--color-ink-soft)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
      } ${className}`}
    >
      {isSubmitting ? (
        <Loader2 className={`${iconClass} animate-spin`} />
      ) : (
        <Heart
          className={`${iconClass} ${active ? "fill-current" : ""}`}
          strokeWidth={active ? 2.4 : 2}
        />
      )}
      {showLabel && (
        <span className="text-xs font-semibold">
          {active ? "Saved" : "Save"}
        </span>
      )}
    </Button>
  );
};

export default WishlistButton;
