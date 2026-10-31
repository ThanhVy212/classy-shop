import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { catalogService } from "../../services/catalogService.ts";
import type { CatalogItem, CatalogType } from "../../types/catalog.ts";
import { CATALOG_TYPE_LABELS } from "../../types/catalog.ts";

interface TaxonomySelectProps {
  type: CatalogType;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

const sortByName = (items: CatalogItem[]) =>
  [...items].sort((a, b) => a.name.localeCompare(b.name));

const TaxonomySelect = ({
  type,
  label,
  value,
  onChange,
  required = false,
  placeholder,
  disabled = false,
}: TaxonomySelectProps) => {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    catalogService
      .getItems(type)
      .then((data) => {
        if (isMounted) setItems(sortByName(data));
      })
      .catch((error) => {
        console.warn(`Could not load ${type} catalog:`, error);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [type]);

  const options = useMemo(() => {
    if (
      value &&
      !items.some((item) => item.name.toLowerCase() === value.toLowerCase())
    ) {
      return sortByName([
        ...items,
        {
          _id: `current-${type}`,
          type,
          name: value,
        },
      ]);
    }

    return items;
  }, [items, type, value]);

  const closeAdding = () => {
    setIsAdding(false);
    setNewName("");
  };

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;

    const existing = items.find(
      (item) => item.name.toLowerCase() === name.toLowerCase(),
    );

    if (existing) {
      onChange(existing.name);
      closeAdding();
      toast.info(`${CATALOG_TYPE_LABELS[type]} "${existing.name}" already exists`);
      return;
    }

    setIsSaving(true);
    try {
      const item = await catalogService.createItem(type, name);
      setItems((prev) => sortByName([...prev, item]));
      onChange(item.name);
      closeAdding();
      toast.success(`${CATALOG_TYPE_LABELS[type]} "${item.name}" added`);
    } catch (error: unknown) {
      const errResponse = (
        error as {
          response?: { status?: number; data?: { message?: string; item?: CatalogItem } };
        }
      )?.response;

      // A concurrent/existing value: select it instead of failing.
      if (errResponse?.status === 409 && errResponse.data?.item) {
        const item = errResponse.data.item;
        setItems((prev) =>
          sortByName([
            ...prev.filter((entry) => entry._id !== item._id),
            item,
          ]),
        );
        onChange(item.name);
        closeAdding();
        toast.info(errResponse.data.message || "This value already exists");
      } else {
        toast.error(
          errResponse?.data?.message ||
            `Could not add ${type}. Please try again.`,
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <label className="form-label mb-0">
          {label}
          {required ? " *" : ""}
        </label>
        <button
          type="button"
          onClick={() => (isAdding ? closeAdding() : setIsAdding(true))}
          disabled={disabled}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 hover:text-black transition-colors cursor-pointer disabled:opacity-50"
        >
          {isAdding ? (
            <>
              <X className="w-3 h-3" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="w-3 h-3" />
              Add new
            </>
          )}
        </button>
      </div>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        disabled={disabled || isLoading}
        className="form-select"
      >
        <option value="">
          {isLoading
            ? "Loading..."
            : placeholder || `Select ${CATALOG_TYPE_LABELS[type].toLowerCase()}`}
        </option>
        {options.map((item) => (
          <option key={item._id} value={item.name}>
            {item.name}
          </option>
        ))}
      </select>

      {isAdding && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="text"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleAdd();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                closeAdding();
              }
            }}
            placeholder={`New ${CATALOG_TYPE_LABELS[type].toLowerCase()} name`}
            autoFocus
            disabled={isSaving}
            className="form-input flex-1 py-2"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={isSaving || !newName.trim()}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-black text-white text-xs font-semibold hover:bg-gray-800 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            Add
          </button>
        </div>
      )}
    </div>
  );
};

export default TaxonomySelect;
