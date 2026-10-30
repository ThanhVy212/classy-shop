import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronDown } from "lucide-react";

export interface SortOptionItem {
  label: string;
  value: string;
}

export const SORT_OPTIONS: SortOptionItem[] = [
  { label: "FEATURED", value: "featured" },
  { label: "BEST SELLING", value: "bestSelling" },
  { label: "TITLE - ASCENDING", value: "titleAsc" },
  { label: "TITLE - DESCENDING", value: "titleDesc" },
  { label: "PRICE - LOWEST", value: "priceAsc" },
  { label: "PRICE - HIGHEST", value: "priceDesc" },
  { label: "DATE - NEWEST", value: "dateDesc" },
  { label: "DATE - OLDEST", value: "dateAsc" },
];

interface SortOptionsProps {
  onSelect?: () => void;
}

const SortOptions = ({ onSelect }: SortOptionsProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const currentSort = searchParams.get("sortBy") || "dateDesc";

  const handleSelect = (value: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("page");

    if (value && value !== "dateDesc") {
      newParams.set("sortBy", value);
    } else {
      newParams.delete("sortBy");
    }

    setSearchParams(newParams, { replace: true });
    setIsOpen(false);
    onSelect?.();
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close dropdown on window scroll
  useEffect(() => {
    const handleScroll = () => {
      if (isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 sm:gap-2 text-xs font-medium tracking-widest text-neutral-700 hover:text-black uppercase cursor-pointer transition-colors select-none py-1.5"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span>SORT BY</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-neutral-600 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
          {SORT_OPTIONS.map((option) => {
            const isSelected =
              currentSort === option.value ||
              (!searchParams.get("sortBy") && option.value === "dateDesc");

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`w-full text-left px-5 py-2.5 text-xs font-medium tracking-wider uppercase transition-colors cursor-pointer block ${
                  isSelected
                    ? "border-2 border-black bg-gray-50 font-semibold text-black"
                    : "text-neutral-800 hover:bg-neutral-100"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SortOptions;
