import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Edit,
  Loader2,
  Plus,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { catalogService } from "../../services/catalogService.ts";
import type { CatalogItem, CatalogType } from "../../types/catalog.ts";
import { CATALOG_TYPES, CATALOG_TYPE_LABELS } from "../../types/catalog.ts";

const CatalogManagement = () => {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [activeType, setActiveType] = useState<CatalogType>("category");
  const [isLoading, setIsLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadItems = async () => {
    setIsLoading(true);
    try {
      const data = await catalogService.getItems();
      setItems(data);
    } catch (error) {
      console.warn("Could not load catalog:", error);
      toast.error("Could not load catalog values");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const counts = useMemo(() => {
    return CATALOG_TYPES.reduce<Record<CatalogType, number>>(
      (acc, type) => {
        acc[type] = items.filter((item) => item.type === type).length;
        return acc;
      },
      { category: 0, brand: 0, material: 0 },
    );
  }, [items]);

  const visibleItems = useMemo(
    () =>
      items
        .filter((item) => item.type === activeType)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [activeType, items],
  );

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = newName.trim();

    if (!name) {
      toast.error(`Please enter a ${CATALOG_TYPE_LABELS[activeType].toLowerCase()} name`);
      return;
    }

    const existing = items.find(
      (item) =>
        item.type === activeType &&
        item.name.toLowerCase() === name.toLowerCase(),
    );

    if (existing) {
      toast.info(`"${existing.name}" already exists`);
      setNewName("");
      return;
    }

    setIsCreating(true);
    try {
      const item = await catalogService.createItem(activeType, name);
      setItems((prev) => [...prev, item]);
      setNewName("");
      toast.success(
        `${CATALOG_TYPE_LABELS[activeType]} "${item.name}" added successfully`,
      );
    } catch (error: unknown) {
      const errResponse = (
        error as {
          response?: { status?: number; data?: { message?: string; item?: CatalogItem } };
        }
      )?.response;

      if (errResponse?.status === 409 && errResponse.data?.item) {
        setItems((prev) =>
          prev.some((item) => item._id === errResponse.data!.item!._id)
            ? prev
            : [...prev, errResponse.data!.item!],
        );
        setNewName("");
      }

      toast.error(errResponse?.data?.message || "Could not create catalog value");
    } finally {
      setIsCreating(false);
    }
  };

  const startEditing = (item: CatalogItem) => {
    setEditingId(item._id);
    setEditingName(item.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName("");
  };

  const handleUpdate = async (item: CatalogItem) => {
    const name = editingName.trim();
    if (!name) {
      toast.error("Name is required");
      return;
    }

    if (name.toLowerCase() === item.name.toLowerCase()) {
      cancelEditing();
      return;
    }

    setSavingId(item._id);
    try {
      const updated = await catalogService.updateItem(item._id, { name });
      setItems((prev) =>
        prev.map((entry) => (entry._id === updated._id ? updated : entry)),
      );
      cancelEditing();
      toast.success(
        `${CATALOG_TYPE_LABELS[item.type]} renamed to "${updated.name}"`,
      );
    } catch (error: unknown) {
      const message = (
        error as { response?: { data?: { message?: string } } }
      )?.response?.data?.message;
      toast.error(message || "Could not update catalog value");
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (item: CatalogItem) => {
    if (
      !window.confirm(
        `Delete ${item.type} "${item.name}"? This cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      await catalogService.deleteItem(item._id);
      setItems((prev) => prev.filter((entry) => entry._id !== item._id));
      toast.success(`${CATALOG_TYPE_LABELS[item.type]} "${item.name}" deleted`);
    } catch (error: unknown) {
      const message = (
        error as { response?: { data?: { message?: string } } }
      )?.response?.data?.message;
      toast.error(message || "Could not delete catalog value");
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="page-title">Product Catalog</h1>
          <span className="badge-counter">{items.length} total</span>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Manage the categories, brands, and materials that can be selected for
          products and used by the storefront filters.
        </p>
      </div>

      <div className="card-padded space-y-6">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-4">
          {CATALOG_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                setActiveType(type);
                cancelEditing();
                setNewName("");
              }}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
                activeType === type
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Tags className="w-4 h-4" />
              {CATALOG_TYPE_LABELS[type]}
              <span
                className={`text-[11px] rounded-full px-2 py-0.5 ${
                  activeType === type
                    ? "bg-white/20 text-white"
                    : "bg-white text-gray-600"
                }`}
              >
                {counts[type]}
              </span>
            </button>
          ))}
        </div>

        {/* Add value */}
        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder={`Add a new ${CATALOG_TYPE_LABELS[activeType].toLowerCase()}...`}
            className="form-input flex-1"
          />
          <button
            type="submit"
            disabled={isCreating || !newName.trim()}
            className="btn-primary-action justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Add {CATALOG_TYPE_LABELS[activeType]}
          </button>
        </form>

        {/* List */}
        <div className="border border-gray-200 rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="py-16 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="py-14 text-center text-gray-500">
              <Tags className="w-8 h-8 mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-medium">
                No {CATALOG_TYPE_LABELS[activeType].toLowerCase()} values yet
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Add one above to make it available in product forms and filters.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {visibleItems.map((item) => {
                const isEditing = editingId === item._id;
                const isSaving = savingId === item._id;

                return (
                  <li
                    key={item._id}
                    className="flex items-center gap-3 px-4 sm:px-5 py-3.5 hover:bg-gray-50/70 transition-colors"
                  >
                    {isEditing ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            handleUpdate(item);
                          }
                          if (event.key === "Escape") cancelEditing();
                        }}
                        autoFocus
                        className="form-input flex-1 py-2"
                      />
                    ) : (
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-gray-400 uppercase tracking-wider">
                          {CATALOG_TYPE_LABELS[item.type]}
                        </p>
                      </div>
                    )}

                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleUpdate(item)}
                          disabled={isSaving}
                          className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 transition cursor-pointer disabled:opacity-50"
                          title="Save"
                        >
                          {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          disabled={isSaving}
                          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition cursor-pointer disabled:opacity-50"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => startEditing(item)}
                          className="btn-action-edit"
                          title="Rename"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          className="btn-action-delete"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <p className="text-xs text-gray-500">
          Deleting a value is blocked while products still use it. Renaming a
          value automatically updates every product that uses the old name.
        </p>
      </div>
    </div>
  );
};

export default CatalogManagement;
