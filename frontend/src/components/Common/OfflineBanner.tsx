import { CloudOff, Loader2, RefreshCw } from "lucide-react";
import { useCart } from "../../hooks/useCart";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";

/**
 * Slim status pill that appears while the shopper is offline or while offline
 * cart mutations are being replayed. It stays out of the way of the layout.
 */
const OfflineBanner = () => {
  const isOnline = useOnlineStatus();
  const { pendingSyncCount, refreshCart } = useCart();

  if (isOnline && pendingSyncCount === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex justify-center px-4">
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto flex max-w-md items-center gap-3 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-ink)]/95 px-4 py-2.5 text-xs font-medium text-white shadow-lg backdrop-blur"
      >
        {isOnline ? (
          <>
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            <span>
              Syncing your cart
              {pendingSyncCount > 0 ? ` (${pendingSyncCount})` : ""}...
            </span>
            {pendingSyncCount > 0 && (
              <button
                type="button"
                onClick={() => void refreshCart()}
                aria-label="Retry cart sync"
                className="ml-1 inline-flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold transition-colors hover:bg-white/25"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </button>
            )}
          </>
        ) : (
          <>
            <CloudOff className="h-4 w-4 shrink-0" />
            <span>
              You're offline. Your cart is saved and will sync when you're back
              online.
            </span>
            <button
              type="button"
              onClick={() => void refreshCart()}
              className="ml-1 inline-flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold transition-colors hover:bg-white/25"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default OfflineBanner;
