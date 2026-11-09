import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { PackageOpen } from "lucide-react";

type EmptyStateAction =
  | { label: string; to: string }
  | { label: string; onClick: () => void };

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: EmptyStateAction;
  compact?: boolean;
  className?: string;
}

/**
 * Shared empty / unavailable state for storefront sections. It never falls
 * back to sample products: shoppers either see real catalog data or a clear
 * message that there is nothing to show yet.
 */
const EmptyState = ({
  title,
  description,
  icon,
  action,
  compact = false,
  className = "",
}: EmptyStateProps) => (
  <div
    className={`flex flex-col items-center justify-center text-center ${
      compact ? "px-5 py-10" : "px-6 py-14"
    } ${className}`}
  >
    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
      {icon ?? <PackageOpen className="h-6 w-6" />}
    </span>
    <h3 className="mt-4 text-base font-semibold text-[var(--color-ink)]">
      {title}
    </h3>
    {description && (
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-[var(--color-ink-soft)]">
        {description}
      </p>
    )}
    {action &&
      ("to" in action ? (
        <Link
          to={action.to}
          className="btn-black mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em]"
        >
          {action.label}
        </Link>
      ) : (
        <button
          type="button"
          onClick={action.onClick}
          className="btn-outline mt-5 text-xs font-semibold uppercase tracking-[0.14em]"
        >
          {action.label}
        </button>
      ))}
  </div>
);

export default EmptyState;
