import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Boxes,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileDown,
  FileUp,
  Filter,
  History,
  Package,
  RefreshCw,
  Search,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import Button from "../Common/Button.tsx";
import { inventoryService } from "../../services/inventoryService";
import {
  ADMIN_STOCK_ALERT_EVENT,
  ADMIN_STOCK_UPDATED_EVENT,
  connectAdminSocket,
} from "../../services/socket";
import type {
  CsvImportResult,
  InventoryHistoryEntry,
  InventoryHistoryResponse,
  InventoryMovementType,
  InventoryResponse,
  InventoryRow,
  InventorySort,
  InventoryStatus,
  InventoryStatusFilter,
  StockChangeMode,
} from "../../types/inventory";
import { getApiErrorMessage } from "../../utils/apiError";
import { downloadBlob } from "../../utils/download";
import { formatOrderDateTime } from "../../utils/order";

const PAGE_SIZE = 20;
const HISTORY_PAGE_SIZE = 15;

const STATUS_META: Record<
  InventoryStatus,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  in_stock: {
    label: "In stock",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  low_stock: {
    label: "Low stock",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    icon: AlertTriangle,
  },
  out_of_stock: {
    label: "Out of stock",
    className: "bg-red-50 text-red-700 border-red-200",
    icon: XCircle,
  },
};

const MOVEMENT_META: Record<
  InventoryMovementType,
  { label: string; className: string }
> = {
  import: {
    label: "Stock in",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  export: {
    label: "Stock out",
    className: "bg-red-50 text-red-700 border-red-200",
  },
  adjustment: {
    label: "Adjustment",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  bulk_update: {
    label: "Bulk update",
    className: "bg-purple-50 text-purple-700 border-purple-200",
  },
  csv_import: {
    label: "CSV import",
    className: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  order_out: {
    label: "Order sale",
    className: "bg-rose-50 text-rose-700 border-rose-200",
  },
  order_return: {
    label: "Order return",
    className: "bg-teal-50 text-teal-700 border-teal-200",
  },
};

const MOVEMENT_TYPES: InventoryMovementType[] = [
  "import",
  "export",
  "adjustment",
  "bulk_update",
  "csv_import",
  "order_out",
  "order_return",
];

const getVariantLabel = (row: { size: string; color: string }) =>
  [row.size, row.color].filter(Boolean).join(" / ") || "Default";

const getStockText = (stock: number, threshold: number) => {
  if (stock <= 0) return "No units left";
  if (stock <= threshold) return `${stock} left · reorder soon`;
  return `${stock} in stock`;
};

const InventoryManagement = () => {
  const [activeTab, setActiveTab] = useState<"stock" | "history">("stock");
  const [inventory, setInventory] = useState<InventoryResponse | null>(null);
  const [history, setHistory] = useState<InventoryHistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<InventoryStatusFilter>("all");
  const [sort, setSort] = useState<InventorySort>("stockAsc");
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState<StockChangeMode>("set");
  const [bulkValue, setBulkValue] = useState("10");
  const [bulkReason, setBulkReason] = useState("Stock take");
  const [isBulkApplying, setIsBulkApplying] = useState(false);
  const [bulkErrors, setBulkErrors] = useState<
    { row: number; message: string }[]
  >([]);

  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({});
  const [savingRowId, setSavingRowId] = useState<string | null>(null);

  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importResult, setImportResult] = useState<CsvImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const inventoryRequestRef = useRef(0);
  const historyRequestRef = useRef(0);

  const [historySearchInput, setHistorySearchInput] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [debouncedHistorySearch, setDebouncedHistorySearch] = useState("");
  const [historyType, setHistoryType] = useState<InventoryMovementType | "all">(
    "all"
  );
  const [historyFrom, setHistoryFrom] = useState("");
  const [historyTo, setHistoryTo] = useState("");
  const [historyPage, setHistoryPage] = useState(1);

  const [isLive, setIsLive] = useState(false);
  const reloadRef = useRef<{
    inventory: () => Promise<void>;
    history: () => Promise<void>;
  }>({ inventory: async () => {}, history: async () => {} });

  // Debounce both search boxes so typing does not hammer the API.
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedHistorySearch(historySearchInput.trim()),
      400
    );
    return () => window.clearTimeout(timer);
  }, [historySearchInput]);

  useEffect(() => {
    setSearch(debouncedSearch);
    setPage(1);
    setSelected(new Set());
    setStockDrafts({});
  }, [debouncedSearch]);

  useEffect(() => {
    setPage(1);
    setSelected(new Set());
    setStockDrafts({});
  }, [category, status, sort]);

  useEffect(() => {
    setHistorySearch(debouncedHistorySearch);
    setHistoryPage(1);
  }, [debouncedHistorySearch]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historyType, historyFrom, historyTo]);

  const loadInventory = useCallback(async () => {
    const requestId = ++inventoryRequestRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const data = await inventoryService.getInventory({
        search,
        category,
        status,
        sort,
        page,
        limit: PAGE_SIZE,
      });

      if (requestId !== inventoryRequestRef.current) return;
      setInventory(data);
    } catch (loadError) {
      if (requestId !== inventoryRequestRef.current) return;
      setError(
        getApiErrorMessage(loadError, "Could not load inventory right now.")
      );
    } finally {
      if (requestId === inventoryRequestRef.current) {
        setIsLoading(false);
      }
    }
  }, [search, category, status, sort, page]);

  const loadHistory = useCallback(async () => {
    const requestId = ++historyRequestRef.current;
    setIsHistoryLoading(true);
    setHistoryError(null);

    try {
      const data = await inventoryService.getHistory({
        page: historyPage,
        limit: HISTORY_PAGE_SIZE,
        type: historyType,
        search: historySearch,
        from: historyFrom,
        to: historyTo,
      });

      if (requestId !== historyRequestRef.current) return;
      setHistory(data);
    } catch (loadError) {
      if (requestId !== historyRequestRef.current) return;
      setHistoryError(
        getApiErrorMessage(
          loadError,
          "Could not load inventory history right now."
        )
      );
    } finally {
      if (requestId === historyRequestRef.current) {
        setIsHistoryLoading(false);
      }
    }
  }, [historyPage, historyType, historySearch, historyFrom, historyTo]);

  useEffect(() => {
    setSelected(new Set());
    setStockDrafts({});
  }, [page]);

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  useEffect(() => {
    reloadRef.current = {
      inventory: loadInventory,
      history: loadHistory,
    };
  }, [loadInventory, loadHistory]);

  useEffect(() => {
    if (activeTab !== "history") return;
    void loadHistory();
  }, [activeTab, loadHistory]);

  // Real-time refresh when any admin changes stock or an order consumes it.
  useEffect(() => {
    const socket = connectAdminSocket();
    setIsLive(socket.connected);
    let refreshTimer: number | null = null;

    const scheduleRefresh = () => {
      if (refreshTimer) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        void reloadRef.current.inventory();
        void reloadRef.current.history();
      }, 400);
    };

    const handleConnect = () => setIsLive(true);
    const handleDisconnect = () => setIsLive(false);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on(ADMIN_STOCK_ALERT_EVENT, scheduleRefresh);
    socket.on(ADMIN_STOCK_UPDATED_EVENT, scheduleRefresh);

    return () => {
      if (refreshTimer) window.clearTimeout(refreshTimer);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off(ADMIN_STOCK_ALERT_EVENT, scheduleRefresh);
      socket.off(ADMIN_STOCK_UPDATED_EVENT, scheduleRefresh);
    };
  }, []);

  const rows = inventory?.rows ?? [];
  const summary = inventory?.summary;
  const selectedRows = rows.filter((row) => selected.has(row.rowId));
  const allVisibleSelected =
    rows.length > 0 && rows.every((row) => selected.has(row.rowId));

  const toggleRow = (rowId: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelected((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        rows.forEach((row) => next.delete(row.rowId));
      } else {
        rows.forEach((row) => next.add(row.rowId));
      }
      return next;
    });
  };

  const updateDraft = (rowId: string, value: string) => {
    setStockDrafts((current) => ({ ...current, [rowId]: value }));
  };

  const handleSaveRow = async (row: InventoryRow) => {
    const raw = stockDrafts[row.rowId] ?? String(row.stock);
    const value = Number(raw);

    if (raw.trim() === "" || !Number.isInteger(value) || value < 0) {
      toast.error("Stock must be a whole number of zero or more.");
      return;
    }

    setSavingRowId(row.rowId);

    try {
      await inventoryService.adjustStock({
        productId: row.productId,
        size: row.size,
        color: row.color,
        mode: "set",
        value,
        reason: "Inline stock update",
      });

      toast.success(`Stock updated for ${row.productName}.`);
      setStockDrafts((current) => {
        const next = { ...current };
        delete next[row.rowId];
        return next;
      });
      await loadInventory();
    } catch (saveError) {
      toast.error(
        getApiErrorMessage(saveError, "Could not update this stock value.")
      );
    } finally {
      setSavingRowId(null);
    }
  };

  const handleBulkApply = async () => {
    if (selectedRows.length === 0) {
      toast.error("Select at least one inventory row first.");
      return;
    }

    const value = Number(bulkValue);
    if (bulkValue.trim() === "" || !Number.isInteger(value) || value < 0) {
      toast.error("Enter a whole number of zero or more.");
      return;
    }

    if (bulkMode !== "set" && value < 1) {
      toast.error("The quantity to add or remove must be at least 1.");
      return;
    }

    setIsBulkApplying(true);
    setBulkErrors([]);

    try {
      const result = await inventoryService.bulkUpdate({
        mode: bulkMode,
        reason: bulkReason.trim() || "Bulk inventory update",
        items: selectedRows.map((row) => ({
          productId: row.productId,
          size: row.size,
          color: row.color,
          value,
        })),
      });

      if (result.failed > 0) {
        toast.warning(result.message);
        setBulkErrors(result.errors);
      } else {
        toast.success(result.message);
      }

      setSelected(new Set());
      await loadInventory();
    } catch (bulkError) {
      toast.error(
        getApiErrorMessage(bulkError, "Could not apply the bulk update.")
      );
    } finally {
      setIsBulkApplying(false);
    }
  };

  const handleImportFile = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const result = await inventoryService.importCsv(file, {
        reason: "CSV stock import",
      });

      setImportResult(result);

      if (result.failed > 0) {
        toast.warning(result.message);
      } else {
        toast.success(result.message);
      }

      await loadInventory();
    } catch (importError) {
      toast.error(
        getApiErrorMessage(importError, "Could not import this CSV file.")
      );
    } finally {
      setIsImporting(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const blob = await inventoryService.exportCsv({
        search,
        category,
        status,
        sort,
      });
      downloadBlob(
        blob,
        `inventory-${new Date().toISOString().slice(0, 10)}.csv`
      );
      toast.success("Inventory CSV downloaded.");
    } catch (exportError) {
      toast.error(
        getApiErrorMessage(exportError, "Could not export inventory.")
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await inventoryService.getTemplate();
      downloadBlob(
        blob,
        `inventory-template-${new Date().toISOString().slice(0, 10)}.csv`
      );
      toast.success("CSV template downloaded.");
    } catch (templateError) {
      toast.error(
        getApiErrorMessage(templateError, "Could not download the template.")
      );
    }
  };

  const lowStockCount =
    (summary?.lowStockRows ?? 0) + (summary?.outOfStockRows ?? 0);

  const stats = [
    {
      title: "Total Units",
      value: summary ? summary.totalUnits.toLocaleString("en-US") : "—",
      hint: summary
        ? `Across ${summary.totalProducts.toLocaleString("en-US")} product(s)`
        : "Loading inventory",
      icon: Package,
      color: "text-blue-600 bg-blue-50",
    },
    {
      title: "Low Stock",
      value: summary ? summary.lowStockRows.toLocaleString("en-US") : "—",
      hint: summary
        ? `At or below ${summary.threshold} units`
        : "Loading alerts",
      icon: AlertTriangle,
      color: "text-amber-600 bg-amber-50",
    },
    {
      title: "Out of Stock",
      value: summary ? summary.outOfStockRows.toLocaleString("en-US") : "—",
      hint: "Needs immediate restock",
      icon: XCircle,
      color: "text-red-600 bg-red-50",
    },
    {
      title: "Tracked Rows",
      value: summary ? summary.totalRows.toLocaleString("en-US") : "—",
      hint: "Size/color combinations",
      icon: Boxes,
      color: "text-purple-600 bg-purple-50",
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="page-title">Inventory Control</h1>
            <span className="badge-counter">
              Alert threshold: {inventory?.threshold ?? 10}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                isLive
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isLive ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
              {isLive ? "Live alerts on" : "Reconnecting…"}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Track stock per size/color, review every stock movement, update many
            rows at once and move data in or out with CSV.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={() => void loadInventory()}
            disabled={isLoading}
            className="btn-outline inline-flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            type="button"
            onClick={() => void handleDownloadTemplate()}
            className="btn-outline inline-flex items-center gap-2"
          >
            <FileDown className="w-4 h-4" />
            <span>Template</span>
          </Button>

          <Button
            type="button"
            onClick={() => void handleExport()}
            disabled={isExporting}
            className="btn-outline inline-flex items-center gap-2"
          >
            <Download className={`w-4 h-4 ${isExporting ? "animate-pulse" : ""}`} />
            <span>Export CSV</span>
          </Button>

          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="btn-primary-action"
          >
            {isImporting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            <span>{isImporting ? "Importing…" : "Import CSV"}</span>
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => void handleImportFile(event)}
          />
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <p>{error}</p>
            <Button
              type="button"
              onClick={() => void loadInventory()}
              className="mt-2 text-xs font-semibold underline underline-offset-2"
            >
              Try again
            </Button>
          </div>
        </div>
      )}

      {lowStockCount > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                {lowStockCount} inventory row(s) need attention
              </p>
              <p className="text-xs text-amber-700">
                {summary?.outOfStockRows ?? 0} out of stock ·{" "}
                {summary?.lowStockRows ?? 0} low stock. Alerts are pushed to
                every connected admin in real time.
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => {
              setStatus("attention");
              setPage(1);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
          >
            <Filter className="w-3.5 h-3.5" />
            Show items to restock
          </Button>
        </div>
      )}

      {importResult && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-gray-900">
                CSV import finished
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {importResult.updated} updated · {importResult.skipped} unchanged
                · {importResult.failed} failed · {importResult.totalRows} row(s)
                in batch {importResult.batchId}
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setImportResult(null)}
              className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              aria-label="Dismiss import result"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {importResult.errors.length > 0 && (
            <div className="mt-3 max-h-48 overflow-y-auto rounded-xl border border-red-100 bg-red-50/60 p-3">
              <ul className="space-y-1.5 text-xs text-red-700">
                {importResult.errors.slice(0, 50).map((item, index) => (
                  <li key={`${item.line}-${index}`}>
                    <span className="font-semibold">Line {item.line}</span>
                    {item.sku ? ` · ${item.sku}` : ""} — {item.message}
                  </li>
                ))}
              </ul>
              {importResult.errors.length > 50 && (
                <p className="mt-2 text-[11px] font-semibold text-red-600">
                  …and {importResult.errors.length - 50} more error(s).
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="admin-stat-card">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">
                  {stat.title}
                </span>
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <p className="mt-4 text-2xl sm:text-3xl font-extrabold text-gray-950">
                {stat.value}
              </p>
              <p className="mt-1.5 text-xs text-gray-400">{stat.hint}</p>
            </div>
          );
        })}
      </div>

      <div className="card-container">
        <div className="flex items-center gap-1 border-b border-gray-100 px-4">
          <button
            type="button"
            onClick={() => setActiveTab("stock")}
            className={`inline-flex items-center gap-2 border-b-2 px-3 py-3.5 text-sm font-semibold transition ${
              activeTab === "stock"
                ? "border-black text-gray-950"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <Boxes className="w-4 h-4" />
            Stock levels
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`inline-flex items-center gap-2 border-b-2 px-3 py-3.5 text-sm font-semibold transition ${
              activeTab === "history"
                ? "border-black text-gray-950"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <History className="w-4 h-4" />
            Movement history
          </button>
        </div>

        {activeTab === "stock" ? (
          <>
            <div className="flex flex-col lg:flex-row gap-3 justify-between border-b border-gray-100 bg-white p-4">
              <div className="relative w-full lg:w-96">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search product name, SKU or variant SKU…"
                  className="admin-search-input"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="admin-filter-select"
                >
                  <option value="all">All Categories</option>
                  {(inventory?.categories ?? []).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>

                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as InventoryStatus | "all")
                  }
                  className="admin-filter-select"
                >
                  <option value="all">All Stock Status</option>
                  <option value="attention">Needs attention</option>
                  <option value="in_stock">In stock</option>
                  <option value="low_stock">Low stock</option>
                  <option value="out_of_stock">Out of stock</option>
                </select>

                <select
                  value={sort}
                  onChange={(event) =>
                    setSort(event.target.value as InventorySort)
                  }
                  className="admin-filter-select"
                >
                  <option value="stockAsc">Lowest stock first</option>
                  <option value="stockDesc">Highest stock first</option>
                  <option value="nameAsc">Name A → Z</option>
                  <option value="nameDesc">Name Z → A</option>
                  <option value="categoryAsc">Category</option>
                  <option value="updatedDesc">Recently updated</option>
                </select>
              </div>
            </div>

            {selectedRows.length > 0 && (
              <div className="flex flex-col xl:flex-row xl:items-center gap-3 border-b border-blue-100 bg-blue-50/70 px-4 py-3">
                <span className="text-xs font-bold text-blue-900">
                  {selectedRows.length} row(s) selected
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={bulkMode}
                    onChange={(event) =>
                      setBulkMode(event.target.value as StockChangeMode)
                    }
                    className="rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700"
                  >
                    <option value="set">Set stock to</option>
                    <option value="increase">Add units</option>
                    <option value="decrease">Remove units</option>
                  </select>

                  <input
                    type="number"
                    min={0}
                    value={bulkValue}
                    onChange={(event) => setBulkValue(event.target.value)}
                    className="w-24 rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-xs text-gray-800"
                    aria-label="Bulk stock value"
                  />

                  <input
                    type="text"
                    value={bulkReason}
                    onChange={(event) => setBulkReason(event.target.value)}
                    placeholder="Reason (e.g. stock take)"
                    className="w-52 rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-xs text-gray-800"
                    aria-label="Bulk update reason"
                  />

                  <Button
                    type="button"
                    onClick={() => void handleBulkApply()}
                    disabled={isBulkApplying}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                  >
                    {isBulkApplying ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    Apply to selected
                  </Button>

                  <Button
                    type="button"
                    onClick={() => {
                      setSelected(new Set());
                      setBulkErrors([]);
                    }}
                    className="text-xs font-semibold text-blue-700 underline underline-offset-2"
                  >
                    Clear selection
                  </Button>
                </div>
              </div>
            )}

            {bulkErrors.length > 0 && (
              <div className="border-b border-red-100 bg-red-50/70 px-4 py-3">
                <p className="text-xs font-bold text-red-800">
                  Some rows could not be updated:
                </p>
                <ul className="mt-1.5 space-y-1 text-xs text-red-700">
                  {bulkErrors.slice(0, 20).map((item) => (
                    <li key={`${item.row}-${item.message}`}>
                      Row {item.row}: {item.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="py-16 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
                </div>
              ) : (
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="table-head-row">
                    <tr>
                      <th className="py-3.5 px-4 w-10">
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={toggleAllVisible}
                          className="form-checkbox"
                          aria-label="Select all visible inventory rows"
                        />
                      </th>
                      <th className="py-3.5 px-4">Product</th>
                      <th className="py-3.5 px-4">Variant</th>
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4">Stock</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Last updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.length > 0 ? (
                      rows.map((row) => {
                        const meta = STATUS_META[row.status];
                        const StatusIcon = meta.icon;
                        const draft = stockDrafts[row.rowId] ?? String(row.stock);
                        const isDirty = draft !== String(row.stock);

                        return (
                          <tr key={row.rowId} className="table-row-hover">
                            <td className="py-4 px-4">
                              <input
                                type="checkbox"
                                checked={selected.has(row.rowId)}
                                onChange={() => toggleRow(row.rowId)}
                                className="form-checkbox"
                                aria-label={`Select ${row.productName} ${getVariantLabel(
                                  row
                                )}`}
                              />
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                {row.image ? (
                                  <img
                                    src={row.image}
                                    alt={row.productName}
                                    className="w-11 h-14 object-cover rounded-xl border border-gray-200 shrink-0"
                                  />
                                ) : (
                                  <div className="w-11 h-14 rounded-xl border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center shrink-0">
                                    <Package className="w-4 h-4 text-gray-300" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="font-semibold text-gray-900 line-clamp-1">
                                    {row.productName}
                                  </p>
                                  <p className="text-[11px] text-gray-400 font-mono">
                                    {row.productSku || "—"}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <p className="text-xs font-semibold text-gray-800">
                                {getVariantLabel(row)}
                              </p>
                              {row.variantSku && row.variantSku !== row.productSku && (
                                <p className="text-[11px] text-gray-400 font-mono">
                                  {row.variantSku}
                                </p>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              <span className="text-xs px-2.5 py-1 bg-gray-100 rounded-lg text-gray-700 font-medium">
                                {row.category || "Uncategorised"}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={0}
                                  value={draft}
                                  onChange={(event) =>
                                    updateDraft(row.rowId, event.target.value)
                                  }
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      event.preventDefault();
                                      void handleSaveRow(row);
                                    }
                                  }}
                                  className={`w-20 rounded-lg border px-2 py-1.5 text-xs font-semibold ${
                                    row.status === "out_of_stock"
                                      ? "border-red-200 bg-red-50 text-red-700"
                                      : row.status === "low_stock"
                                        ? "border-amber-200 bg-amber-50 text-amber-700"
                                        : "border-gray-200 bg-white text-gray-800"
                                  }`}
                                  aria-label={`Stock for ${row.productName} ${getVariantLabel(
                                    row
                                  )}`}
                                />
                                {isDirty && (
                                  <Button
                                    type="button"
                                    onClick={() => void handleSaveRow(row)}
                                    disabled={savingRowId === row.rowId}
                                    className="rounded-lg bg-emerald-600 p-1.5 text-white transition hover:bg-emerald-700 disabled:opacity-60"
                                    title="Save stock"
                                  >
                                    {savingRowId === row.rowId ? (
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Check className="w-3.5 h-3.5" />
                                    )}
                                  </Button>
                                )}
                              </div>
                              <p className="mt-1 text-[10px] text-gray-400">
                                {getStockText(row.stock, row.threshold)}
                              </p>
                            </td>
                            <td className="py-4 px-4">
                              <span
                                className={`status-badge ${meta.className}`}
                              >
                                <StatusIcon className="w-3.5 h-3.5" />
                                {meta.label}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-xs text-gray-500 whitespace-nowrap">
                              {row.updatedAt
                                ? formatOrderDateTime(row.updatedAt)
                                : "—"}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-14 text-center">
                          <Boxes className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                          <p className="text-sm font-semibold text-gray-700">
                            No inventory rows match these filters
                          </p>
                          <p className="mt-1 text-xs text-gray-400">
                            Try another search, category or stock status.
                          </p>
                          <Button
                            type="button"
                            onClick={() => {
                              setSearchInput("");
                              setCategory("all");
                              setStatus("all");
                            }}
                            className="mt-3 text-xs font-semibold text-red-600 underline"
                          >
                            Reset filters
                          </Button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            <div className="table-footer">
              <span>
                {inventory
                  ? `Showing ${
                      inventory.pagination.total === 0
                        ? 0
                        : (inventory.pagination.page - 1) *
                            inventory.pagination.limit +
                          1
                    }–${Math.min(
                      inventory.pagination.page * inventory.pagination.limit,
                      inventory.pagination.total
                    )} of ${inventory.pagination.total.toLocaleString(
                      "en-US"
                    )} row(s)`
                  : "Loading inventory…"}
              </span>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={!inventory?.pagination.hasPrevPage}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Prev
                </Button>
                <span className="text-xs font-medium text-gray-500">
                  Page {inventory?.pagination.page ?? 1} of{" "}
                  {inventory?.pagination.totalPages ?? 1}
                </span>
                <Button
                  type="button"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={!inventory?.pagination.hasNextPage}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            {historyError && (
              <div className="flex items-start gap-3 border-b border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="flex-1">{historyError}</p>
                <Button
                  type="button"
                  onClick={() => void loadHistory()}
                  className="text-xs font-semibold underline"
                >
                  Retry
                </Button>
              </div>
            )}

            <div className="flex flex-col lg:flex-row gap-3 justify-between border-b border-gray-100 bg-white p-4">
              <div className="relative w-full lg:w-80">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={historySearchInput}
                  onChange={(event) => setHistorySearchInput(event.target.value)}
                  placeholder="Search product, SKU, reason or order…"
                  className="admin-search-input"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={historyType}
                  onChange={(event) =>
                    setHistoryType(
                      event.target.value as InventoryMovementType | "all"
                    )
                  }
                  className="admin-filter-select"
                >
                  <option value="all">All movement types</option>
                  {MOVEMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {MOVEMENT_META[type].label}
                    </option>
                  ))}
                </select>

                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                  From
                  <input
                    type="date"
                    value={historyFrom}
                    onChange={(event) => setHistoryFrom(event.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700"
                  />
                </label>

                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                  To
                  <input
                    type="date"
                    value={historyTo}
                    onChange={(event) => setHistoryTo(event.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700"
                  />
                </label>

                <Button
                  type="button"
                  onClick={() => void loadHistory()}
                  disabled={isHistoryLoading}
                  className="btn-outline inline-flex items-center gap-2"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${
                      isHistoryLoading ? "animate-spin" : ""
                    }`}
                  />
                  Refresh
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              {isHistoryLoading ? (
                <div className="py-16 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
                </div>
              ) : (
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="table-head-row">
                    <tr>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4">Product</th>
                      <th className="py-3.5 px-4">Variant</th>
                      <th className="py-3.5 px-4">Type</th>
                      <th className="py-3.5 px-4">Change</th>
                      <th className="py-3.5 px-4">Stock after</th>
                      <th className="py-3.5 px-4">Reason / reference</th>
                      <th className="py-3.5 px-4">By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {history && history.entries.length > 0 ? (
                      history.entries.map((entry: InventoryHistoryEntry) => {
                        const meta = MOVEMENT_META[entry.type];
                        const positive = entry.quantity > 0;

                        return (
                          <tr key={entry._id} className="table-row-hover">
                            <td className="py-4 px-4 whitespace-nowrap text-xs text-gray-500">
                              {formatOrderDateTime(entry.createdAt)}
                            </td>
                            <td className="py-4 px-4">
                              <p className="font-semibold text-gray-900 line-clamp-1">
                                {entry.productName || "Product"}
                              </p>
                              <p className="text-[11px] text-gray-400 font-mono">
                                {entry.productSku || entry.sku || "—"}
                              </p>
                            </td>
                            <td className="py-4 px-4 text-xs text-gray-700">
                              {getVariantLabel(entry)}
                            </td>
                            <td className="py-4 px-4">
                              <span
                                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.className}`}
                              >
                                {meta.label}
                              </span>
                            </td>
                            <td className="py-4 px-4 whitespace-nowrap">
                              <span
                                className={`text-sm font-bold ${
                                  positive ? "text-emerald-600" : "text-red-600"
                                }`}
                              >
                                {positive ? "+" : ""}
                                {entry.quantity}
                              </span>
                              <span className="ml-1 text-[11px] text-gray-400">
                                ({entry.previousStock} → {entry.newStock})
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <span
                                className={`text-sm font-semibold ${
                                  entry.newStock === 0
                                    ? "text-red-600"
                                    : "text-gray-900"
                                }`}
                              >
                                {entry.newStock}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <p className="text-xs text-gray-700 line-clamp-1">
                                {entry.reason || "—"}
                              </p>
                              {(entry.note || entry.reference) && (
                                <p className="text-[11px] text-gray-400 line-clamp-1">
                                  {entry.reference
                                    ? `${entry.reference}${entry.note ? " · " : ""}`
                                    : ""}
                                  {entry.note}
                                </p>
                              )}
                            </td>
                            <td className="py-4 px-4 text-xs text-gray-500">
                              {entry.performedByName ||
                                (entry.source === "order" ? "Customer" : "System")}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-14 text-center">
                          <History className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                          <p className="text-sm font-semibold text-gray-700">
                            No stock movements yet
                          </p>
                          <p className="mt-1 text-xs text-gray-400">
                            Stock changes from orders, manual updates, bulk
                            actions and CSV imports will appear here.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            <div className="table-footer">
              <span>
                {history
                  ? `${history.total.toLocaleString(
                      "en-US"
                    )} movement(s) recorded`
                  : "Loading history…"}
              </span>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() =>
                    setHistoryPage((current) => Math.max(1, current - 1))
                  }
                  disabled={historyPage <= 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Prev
                </Button>
                <span className="text-xs font-medium text-gray-500">
                  Page {history?.page ?? historyPage} of {history?.pages ?? 1}
                </span>
                <Button
                  type="button"
                  onClick={() => setHistoryPage((current) => current + 1)}
                  disabled={!history || history.page >= history.pages}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <p className="flex items-center justify-end gap-1.5 text-xs text-gray-400">
        <FileUp className="w-3.5 h-3.5" />
        CSV headers: productId, productSku, sku, size, color, stock, mode,
        reason
      </p>
    </div>
  );
};

export default InventoryManagement;
