import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  AlertCircle,
  BadgePercent,
  CheckCircle2,
  Loader2,
  Plus,
  Power,
  RefreshCw,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import Button from "../Common/Button.tsx";
import { discountService } from "../../services/discountService";
import type { DiscountCode } from "../../types/discount";
import { formatMoney, formatOrderDate } from "../../utils/order";
import { getApiErrorMessage } from "../../utils/apiError";

type DiscountKind = "percentage" | "percentage_capped" | "fixed";

const KIND_OPTIONS: Array<{ value: DiscountKind; label: string }> = [
  { value: "percentage", label: "Percentage (%)" },
  { value: "percentage_capped", label: "Percentage with max cap" },
  { value: "fixed", label: "Fixed amount ($)" },
];

const EMPTY_FORM = {
  code: "",
  description: "",
  kind: "percentage" as DiscountKind,
  value: "",
  maxDiscountAmount: "",
  minOrderAmount: "",
  isActive: true,
};

const getDiscountSummary = (discount: DiscountCode) => {
  if (discount.type === "fixed") {
    return `${formatMoney(discount.value)} off`;
  }

  if (discount.maxDiscountAmount != null) {
    return `${discount.value}% off · max ${formatMoney(
      discount.maxDiscountAmount
    )}`;
  }

  return `${discount.value}% off`;
};

const getMinimumOrderLabel = (discount: DiscountCode) => {
  const minimum = Number(discount.minOrderAmount);

  if (!Number.isFinite(minimum) || minimum <= 0) return null;

  return `Min. order ${formatMoney(minimum)}`;
};

const DiscountManagement = () => {
  const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM }));
  const [isCreating, setIsCreating] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadDiscounts = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await discountService.getAll();
      setDiscounts(data);
    } catch (loadError) {
      setError(
        getApiErrorMessage(
          loadError,
          "Could not load discount codes right now."
        )
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDiscounts();
  }, [loadDiscounts]);

  const filteredDiscounts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return discounts;

    return discounts.filter(
      (discount) =>
        discount.code.toLowerCase().includes(query) ||
        (discount.description || "").toLowerCase().includes(query)
    );
  }, [discounts, search]);

  const activeCount = discounts.filter((discount) => discount.isActive).length;

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedCode = form.code.trim().toUpperCase();

    if (!/^[A-Z0-9_-]{3,30}$/.test(normalizedCode)) {
      toast.error(
        "Use 3–30 characters: letters, numbers, hyphens or underscores."
      );
      return;
    }

    const numericValue = Number(form.value);

    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      toast.error("Discount value must be greater than 0.");
      return;
    }

    const isPercentage = form.kind !== "fixed";

    if (isPercentage && numericValue > 100) {
      toast.error("Percentage discount cannot be greater than 100%.");
      return;
    }

    let maxCap: number | null = null;

    if (form.kind === "percentage_capped") {
      maxCap = Number(form.maxDiscountAmount);

      if (!Number.isFinite(maxCap) || maxCap <= 0) {
        toast.error("Maximum discount amount must be greater than 0.");
        return;
      }
    }

    let minOrder: number | null = null;

    if (form.minOrderAmount.trim()) {
      minOrder = Number(form.minOrderAmount);

      if (!Number.isFinite(minOrder) || minOrder < 0) {
        toast.error("Minimum order amount cannot be negative.");
        return;
      }

      if (minOrder === 0) {
        minOrder = null;
      }
    }

    setIsCreating(true);

    try {
      const created = await discountService.create({
        code: normalizedCode,
        description: form.description.trim(),
        type: isPercentage ? "percentage" : "fixed",
        value: numericValue,
        maxDiscountAmount: maxCap,
        minOrderAmount: minOrder,
        isActive: form.isActive,
      });

      setDiscounts((current) => [created, ...current]);
      setForm({ ...EMPTY_FORM });
      toast.success(`Discount code ${created.code} created`);
    } catch (createError) {
      toast.error(
        getApiErrorMessage(createError, "Could not create the discount code.")
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggle = async (discount: DiscountCode) => {
    setTogglingId(discount._id);

    try {
      const updated = await discountService.updateStatus(
        discount._id,
        !discount.isActive
      );
      setDiscounts((current) =>
        current.map((item) => (item._id === updated._id ? updated : item))
      );
      toast.success(
        `${updated.code} ${updated.isActive ? "activated" : "deactivated"}`
      );
    } catch (toggleError) {
      toast.error(
        getApiErrorMessage(toggleError, "Could not update the discount code.")
      );
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (discount: DiscountCode) => {
    if (
      !window.confirm(
        `Delete discount code "${discount.code}"? This cannot be undone.`
      )
    ) {
      return;
    }

    setDeletingId(discount._id);

    try {
      await discountService.delete(discount._id);
      setDiscounts((current) =>
        current.filter((item) => item._id !== discount._id)
      );
      toast.success(`Discount code ${discount.code} deleted`);
    } catch (deleteError) {
      toast.error(
        getApiErrorMessage(deleteError, "Could not delete the discount code.")
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="page-title">Discount codes</h1>
            <span className="badge-counter">{discounts.length} total</span>
            <span className="badge-counter">{activeCount} active</span>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-[var(--color-ink-soft)]">
            Create percentage, fixed-amount, or capped percentage codes. Codes
            are validated again on the server when an order is placed.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => void loadDiscounts(true)}
          disabled={isRefreshing}
          className="btn-outline inline-flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
        {/* Create form */}
        <section className="card-padded xl:col-span-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <BadgePercent className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-ink)]">
                Add discount code
              </h2>
              <p className="text-xs text-[var(--color-ink-soft)]">
                New codes are available immediately.
              </p>
            </div>
          </div>

          <form onSubmit={(event) => void handleCreate(event)} className="mt-5 space-y-4">
            <div>
              <label htmlFor="discount-code" className="form-label">
                Code
              </label>
              <input
                id="discount-code"
                type="text"
                value={form.code}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    code: event.target.value.toUpperCase(),
                  }))
                }
                placeholder="SUMMER20"
                maxLength={30}
                required
                autoComplete="off"
                className="form-input uppercase tracking-wide"
              />
            </div>

            <div>
              <label htmlFor="discount-description" className="form-label">
                Description <span className="normal-case">(optional)</span>
              </label>
              <input
                id="discount-description"
                type="text"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Summer sale — 20% off"
                maxLength={200}
                className="form-input"
              />
            </div>

            <div>
              <label htmlFor="discount-kind" className="form-label">
                Discount type
              </label>
              <select
                id="discount-kind"
                value={form.kind}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    kind: event.target.value as DiscountKind,
                    maxDiscountAmount: "",
                  }))
                }
                className="form-select"
              >
                {KIND_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div
              className={
                form.kind === "percentage_capped"
                  ? "grid grid-cols-1 gap-3 sm:grid-cols-2"
                  : undefined
              }
            >
              <div>
                <label htmlFor="discount-value" className="form-label">
                  {form.kind === "fixed"
                    ? "Amount off ($)"
                    : "Percentage off (%)"}
                </label>
                <input
                  id="discount-value"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  max={form.kind === "fixed" ? undefined : 100}
                  step="0.01"
                  value={form.value}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      value: event.target.value,
                    }))
                  }
                  placeholder={form.kind === "fixed" ? "15.00" : "20"}
                  required
                  className="form-input"
                />
              </div>

              {form.kind === "percentage_capped" && (
                <div>
                  <label
                    htmlFor="discount-max"
                    className="form-label"
                  >
                    Maximum off ($)
                  </label>
                  <input
                    id="discount-max"
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    step="0.01"
                    value={form.maxDiscountAmount}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        maxDiscountAmount: event.target.value,
                      }))
                    }
                    placeholder="50.00"
                    required
                    className="form-input"
                  />
                </div>
              )}
            </div>

            <div>
              <label htmlFor="discount-min-order" className="form-label">
                Minimum order amount ($){" "}
                <span className="normal-case">(optional)</span>
              </label>
              <input
                id="discount-min-order"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={form.minOrderAmount}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    minOrderAmount: event.target.value,
                  }))
                }
                placeholder="0.00"
                className="form-input"
              />
              <p className="mt-1 text-[11px] text-[var(--color-ink-muted)]">
                Leave blank to allow the code on any order value.
              </p>
            </div>

            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-[var(--color-border)] px-3.5 py-3 text-sm text-[var(--color-ink-soft)]">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    isActive: event.target.checked,
                  }))
                }
                className="form-checkbox"
              />
              Active immediately
            </label>

            <Button
              type="submit"
              disabled={isCreating}
              className="btn-black inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:cursor-wait disabled:opacity-60"
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {isCreating ? "Creating…" : "Create discount code"}
            </Button>
          </form>
        </section>

        {/* Codes list */}
        <section className="card-container xl:col-span-8">
          <div className="flex flex-col gap-3 border-b border-[var(--color-border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-ink)]">
                All discount codes
              </h2>
              <p className="text-xs text-[var(--color-ink-soft)]">
                Toggle availability or delete a code.
              </p>
            </div>

            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-ink-muted)]" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search code or description…"
                aria-label="Search discount codes"
                className="admin-search-input"
              />
            </div>
          </div>

          {error && (
            <div className="m-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="flex-1">
                <p>{error}</p>
                <Button
                  type="button"
                  onClick={() => void loadDiscounts()}
                  className="mt-2 text-xs font-semibold underline underline-offset-2"
                >
                  Try again
                </Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 4 }, (_, index) => (
                <div
                  key={index}
                  className="h-14 animate-pulse rounded-xl bg-[var(--color-surface-muted)]"
                />
              ))}
            </div>
          ) : filteredDiscounts.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-surface-muted)] text-[var(--color-ink-muted)]">
                <BadgePercent className="h-6 w-6" />
              </span>
              <p className="mt-4 text-sm font-semibold text-[var(--color-ink)]">
                {discounts.length === 0
                  ? "No discount codes yet"
                  : "No matching codes"}
              </p>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-[var(--color-ink-soft)]">
                {discounts.length === 0
                  ? "Create your first code with the form on the left."
                  : "Try a different search term."}
              </p>
            </div>
          ) : (
            <div className="w-full">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="table-head-row">
                  <tr>
                    <th className="w-[30%] px-3 py-3.5">Code</th>
                    <th className="w-[20%] px-3 py-3.5">Discount</th>
                    <th className="w-[15%] px-3 py-3.5">Status</th>
                    <th className="hidden w-[13%] px-3 py-3.5 sm:table-cell">
                      Created
                    </th>
                    <th className="w-[22%] px-3 py-3.5 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[var(--color-border)]">
                  {filteredDiscounts.map((discount) => {
                    const isBusy =
                      togglingId === discount._id ||
                      deletingId === discount._id;
                    const minimumOrderLabel =
                      getMinimumOrderLabel(discount);

                    return (
                      <tr
                        key={discount._id}
                        className={`table-row-hover ${
                          isBusy ? "opacity-60" : ""
                        }`}
                      >
                        <td className="px-3 py-4">
                          <div className="min-w-0">
                            <span className="inline-block max-w-full truncate rounded-lg bg-[var(--color-surface-muted)] px-2.5 py-1 font-mono text-xs font-bold tracking-wide text-[var(--color-ink)]">
                              {discount.code}
                            </span>
                            {discount.description && (
                              <p
                                className="mt-1 truncate text-xs text-[var(--color-ink-soft)]"
                                title={discount.description}
                              >
                                {discount.description}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-3 py-4 text-xs font-medium text-[var(--color-ink)]">
                          <p className="break-words">
                            {getDiscountSummary(discount)}
                          </p>
                          {minimumOrderLabel && (
                            <p className="mt-1 text-[11px] font-normal text-[var(--color-ink-muted)]">
                              {minimumOrderLabel}
                            </p>
                          )}
                        </td>

                        <td className="px-3 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              discount.isActive
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-[var(--color-surface-muted)] text-[var(--color-ink-soft)]"
                            }`}
                          >
                            {discount.isActive ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            {discount.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>

                        <td className="hidden whitespace-nowrap px-3 py-4 text-xs text-[var(--color-ink-soft)] sm:table-cell">
                          {formatOrderDate(discount.createdAt)}
                        </td>

                        <td className="px-3 py-4 text-right">
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            <Button
                              type="button"
                              onClick={() => void handleToggle(discount)}
                              disabled={isBusy}
                              className={`inline-flex items-center gap-1 whitespace-nowrap rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors disabled:cursor-wait disabled:opacity-50 ${
                                discount.isActive
                                  ? "border-amber-200 text-amber-700 hover:border-amber-400 hover:bg-amber-50"
                                  : "border-emerald-200 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50"
                              }`}
                              title={
                                discount.isActive
                                  ? "Turn off this discount code"
                                  : "Turn on this discount code"
                              }
                              aria-label={`${
                                discount.isActive ? "Disable" : "Enable"
                              } discount code ${discount.code}`}
                            >
                              {togglingId === discount._id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Power className="h-3 w-3" />
                              )}
                              {discount.isActive ? "Disable" : "Enable"}
                            </Button>

                            <Button
                              type="button"
                              onClick={() => void handleDelete(discount)}
                              disabled={isBusy}
                              className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-[var(--color-border)] px-2 py-1 text-[11px] font-semibold text-[var(--color-ink-soft)] transition-colors hover:border-[var(--color-danger)] hover:text-[var(--color-danger)] disabled:cursor-wait disabled:opacity-50"
                              aria-label={`Delete discount code ${discount.code}`}
                            >
                              {deletingId === discount._id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default DiscountManagement;
