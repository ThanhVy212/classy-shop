import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Loader2, X } from "lucide-react";
import Button from "../Common/Button.tsx";

export const CANCEL_REASONS = [
  "I changed my mind",
  "I no longer need these items",
  "I ordered the wrong size or color",
  "I found a better price elsewhere",
  "The delivery time is too long",
  "Other",
] as const;

const OTHER_REASON = "Other";

interface CancelOrderDialogProps {
  open: boolean;
  orderNumber?: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
}

const CancelOrderDialog = ({
  open,
  orderNumber,
  isSubmitting = false,
  onClose,
  onConfirm,
}: CancelOrderDialogProps) => {
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [otherReason, setOtherReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const otherReasonRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) {
      setSelectedReason("");
      setOtherReason("");
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, isSubmitting, onClose]);

  if (!open) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedReason) {
      setError("Please choose a reason for cancelling this order.");
      return;
    }

    if (selectedReason === OTHER_REASON && !otherReason.trim()) {
      setError("Please describe why you are cancelling this order.");
      otherReasonRef.current?.focus();
      return;
    }

    setError(null);

    const reason =
      selectedReason === OTHER_REASON ? otherReason.trim() : selectedReason;

    await onConfirm(reason);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 px-4 py-4 backdrop-blur-[2px] sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-order-title"
        className="max-h-full w-full max-w-lg overflow-y-auto rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-[var(--color-danger)]">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <h2
                id="cancel-order-title"
                className="text-lg font-semibold text-[var(--color-ink)]"
              >
                Cancel {orderNumber ? `order ${orderNumber}` : "order"}?
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-[var(--color-ink-soft)]">
                Reserved stock will be released. This action cannot be undone.
              </p>
            </div>
          </div>

          <Button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-full p-1.5 text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)] disabled:opacity-50"
            aria-label="Close cancellation dialog"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={(event) => void handleSubmit(event)} className="mt-5">
          <fieldset>
            <legend className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-muted)]">
              Why are you cancelling?
            </legend>

            <div className="mt-3 space-y-2">
              {CANCEL_REASONS.map((reason) => (
                <label
                  key={reason}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition-colors ${
                    selectedReason === reason
                      ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]/70 text-[var(--color-ink)]"
                      : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink-soft)] hover:border-[var(--color-border-strong)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="cancel-reason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={() => {
                      setSelectedReason(reason);
                      setError(null);
                    }}
                    className="h-4 w-4 accent-[var(--color-primary)]"
                  />
                  <span className="font-medium">{reason}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {selectedReason === OTHER_REASON && (
            <div className="mt-3">
              <label
                htmlFor="cancel-other-reason"
                className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-muted)]"
              >
                Tell us more
              </label>
              <textarea
                id="cancel-other-reason"
                ref={otherReasonRef}
                value={otherReason}
                onChange={(event) => {
                  setOtherReason(event.target.value);
                  setError(null);
                }}
                rows={3}
                maxLength={500}
                placeholder="Share the reason for cancelling this order…"
                className="form-input mt-1.5 w-full resize-none"
              />
              <p className="mt-1 text-right text-[10px] text-[var(--color-ink-muted)]">
                {otherReason.length}/500
              </p>
            </div>
          )}

          {error && (
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-[var(--color-danger)]">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-outline justify-center disabled:opacity-50"
            >
              Keep order
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-danger)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? "Cancelling…" : "Cancel order"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default CancelOrderDialog;
