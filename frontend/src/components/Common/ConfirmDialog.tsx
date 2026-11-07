import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Loader2, X } from "lucide-react";
import Button from "./Button.tsx";

type ConfirmDialogTone = "primary" | "danger";

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    description?: ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: ConfirmDialogTone;
    isSubmitting?: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
}

const ConfirmDialog = ({
    open,
    title,
    description,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    tone = "primary",
    isSubmitting = false,
    onClose,
    onConfirm,
}: ConfirmDialogProps) => {
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        if (open) {
            // Capture the element that had focus before opening so we can
            // restore it when the dialog closes.
            const previouslyFocused = document.activeElement as HTMLElement | null;

            // showModal() opens the native dialog, which:
            //   • traps Tab focus within the dialog automatically,
            //   • adds an accessible ::backdrop,
            //   • fires a "cancel" event on Escape.
            if (!dialog.open) dialog.showModal();

            return () => {
                dialog.close();
                previouslyFocused?.focus();
            };
        }
    }, [open]);

    const handleCancel = (event: React.SyntheticEvent<HTMLDialogElement>) => {
        // The native dialog fires "cancel" on Escape. Prevent the default
        // close (which bypasses React state) and delegate to onClose instead,
        // but only when not in the middle of a submission.
        event.preventDefault();
        if (!isSubmitting) onClose();
    };

    const isDanger = tone === "danger";

    return createPortal(
        <dialog
            ref={dialogRef}
            aria-labelledby="confirm-dialog-title"
            onCancel={handleCancel}
            onMouseDown={(event) => {
                // Click on the native backdrop (target is the <dialog> itself).
                if (event.target === event.currentTarget && !isSubmitting) {
                    onClose();
                }
            }}
            className="max-h-full w-full max-w-md overflow-y-auto rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-2xl backdrop:bg-black/45 backdrop:backdrop-blur-[2px] sm:p-6 open:flex open:flex-col"
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                            isDanger
                                ? "bg-red-50 text-[var(--color-danger)]"
                                : "bg-amber-50 text-amber-600"
                        }`}
                    >
                        <AlertTriangle className="h-5 w-5" />
                    </span>
                    <div>
                        <h2
                            id="confirm-dialog-title"
                            className="text-lg font-semibold text-[var(--color-ink)]"
                        >
                            {title}
                        </h2>
                        {description && (
                            <div className="mt-1 text-xs leading-relaxed text-[var(--color-ink-soft)]">
                                {description}
                            </div>
                        )}
                    </div>
                </div>

                <Button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="rounded-full p-1.5 text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)] disabled:opacity-50"
                    aria-label="Close confirmation dialog"
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="btn-outline justify-center disabled:opacity-50"
                >
                    {cancelLabel}
                </Button>
                <Button
                    type="button"
                    onClick={() => void onConfirm()}
                    disabled={isSubmitting}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 ${
                        isDanger
                            ? "bg-[var(--color-danger)]"
                            : "bg-[var(--color-primary)]"
                    }`}
                >
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isSubmitting ? "Working…" : confirmLabel}
                </Button>
            </div>
        </dialog>,
        document.body
    );
};

export default ConfirmDialog;
