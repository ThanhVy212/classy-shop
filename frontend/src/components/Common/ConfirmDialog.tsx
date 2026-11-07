import { useEffect } from "react";
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

    const isDanger = tone === "danger";

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
                aria-labelledby="confirm-dialog-title"
                className="max-h-full w-full max-w-md overflow-y-auto rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-2xl sm:p-6"
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
            </div>
        </div>,
        document.body
    );
};

export default ConfirmDialog;
