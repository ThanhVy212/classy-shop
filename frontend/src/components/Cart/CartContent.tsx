import { Trash2, ShoppingBag } from "lucide-react";
import Button from "../Common/Button.tsx";
import { useCart } from "../../hooks/useCart.ts";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { getColorStyle } from "../../utils/colors.ts";

interface CartContentProps {
  onCloseDrawer?: () => void;
}

const CartContent = ({ onCloseDrawer }: CartContentProps) => {
  const { items, updateQuantity, removeFromCart } = useCart();
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  const getItemKey = (productId: string, size: string, color: string) =>
    `${productId}-${size}-${color}`;

  const handleQuantityChange = async (
    productId: string,
    size: string,
    color: string,
    newQuantity: number
  ) => {
    const key = getItemKey(productId, size, color);
    setUpdatingKey(key);
    try {
      if (newQuantity <= 0) {
        await removeFromCart(productId, size, color);
        toast.success("Item removed from cart");
      } else {
        await updateQuantity(productId, size, color, newQuantity);
      }
    } catch {
      toast.error("Failed to update cart");
    } finally {
      setUpdatingKey(null);
    }
  };

  const handleRemove = async (
    productId: string,
    size: string,
    color: string
  ) => {
    const key = getItemKey(productId, size, color);
    setUpdatingKey(key);
    try {
      await removeFromCart(productId, size, color);
      toast.success("Item removed from cart");
    } catch {
      toast.error("Failed to remove item");
    } finally {
      setUpdatingKey(null);
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <p className="text-lg font-medium text-gray-800 mb-1">
          Your cart is empty
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Looks like you haven't added anything to your cart yet.
        </p>
        <Link
          to="/collections/all"
          onClick={onCloseDrawer}
          className="btn-black py-2.5 px-6 rounded-lg text-sm font-medium inline-block"
        >
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {items.map((item, index) => {
        const itemKey = getItemKey(item.productId, item.size, item.color);
        const isBusy = updatingKey === itemKey;

        return (
          <div
            key={`${item.productId}-${item.size}-${item.color}-${index}`}
            className={`flex items-start justify-between py-4 transition-opacity ${
              isBusy ? "opacity-60 pointer-events-none" : ""
            }`}
          >
            <div className="flex items-center min-w-0 pr-3">
              <div className="mr-4 flex h-24 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)]">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ShoppingBag className="h-5 w-5 text-[var(--color-ink-muted)]" />
                )}
              </div>

              <div className="min-w-0">
                <Link
                  to={`/products/${item.productId}`}
                  onClick={onCloseDrawer}
                  className="font-medium text-gray-900 hover:underline block truncate"
                >
                  {item.name}
                </Link>
                <p className="text-sm text-gray-500 mt-0.5">
                  Size: <span className="font-medium text-gray-700">{item.size}</span> | Color:{" "}
                  <span className="font-medium text-gray-700 inline-flex items-center gap-1.5 align-middle">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full border border-gray-300 shrink-0"
                      style={getColorStyle(item.color)}
                    />
                    {item.color}
                  </span>
                </p>

                <div className="flex items-center mt-3 space-x-2">
                  <Button
                    onClick={() =>
                      handleQuantityChange(
                        item.productId,
                        item.size,
                        item.color,
                        item.quantity - 1
                      )
                    }
                    className="btn-qty h-7 w-7 text-sm font-bold"
                    aria-label="Decrease quantity"
                  >
                    -
                  </Button>
                  <span className="w-8 text-center text-sm font-medium">
                    {item.quantity}
                  </span>
                  <Button
                    onClick={() =>
                      handleQuantityChange(
                        item.productId,
                        item.size,
                        item.color,
                        item.quantity + 1
                      )
                    }
                    className="btn-qty h-7 w-7 text-sm font-bold"
                    aria-label="Increase quantity"
                  >
                    +
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end justify-between self-stretch shrink-0">
              <p className="font-semibold text-gray-900">
                ${(Number(item.price) * item.quantity).toFixed(2)}
              </p>
              <Button
                onClick={() =>
                  handleRemove(item.productId, item.size, item.color)
                }
                className="text-gray-400 hover:text-red-500 transition-colors p-1"
                aria-label="Remove item"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CartContent;
