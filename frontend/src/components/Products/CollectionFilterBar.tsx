import { useHeaderScroll } from "../../hooks/useHeaderScroll";
import SortOptions from "./SortOptions";
import { SlidersHorizontal } from "lucide-react";

interface CollectionFilterBarProps {
  onOpenFilter: () => void;
  activeFilterCount?: number;
}

const CollectionFilterBar = ({
  onOpenFilter,
  activeFilterCount = 0,
}: CollectionFilterBarProps) => {
  const { isNavVisible, isFloating } = useHeaderScroll();

  // When header is floating and visible (scrolling up), hide this filter bar so header smoothly replaces it
  const isHiddenByHeader = isFloating && isNavVisible;

  return (
    <div
      className={`sticky top-0 z-30 w-full bg-white border-b border-gray-200 h-14 flex items-center transition-all duration-300 ease-in-out ${
        isHiddenByHeader
          ? "opacity-0 pointer-events-none -translate-y-2"
          : "opacity-100 pointer-events-auto translate-y-0"
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
        {/* Mobile View: Centered single button FILTER & SORT BY */}
        <div className="md:hidden flex items-center justify-center w-full h-full">
          <button
            type="button"
            onClick={onOpenFilter}
            className="flex items-center justify-center gap-2 text-xs font-medium tracking-widest text-neutral-800 hover:text-black uppercase cursor-pointer w-full h-full select-none"
            aria-label="Open Filter and Sort"
          >
            <span>FILTER &amp; SORT BY</span>
            <SlidersHorizontal className="h-4 w-4 text-neutral-700" />
            {activeFilterCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-black ml-0.5" />
            )}
          </button>
        </div>

        {/* Desktop View: Left FILTER button */}
        <div className="hidden md:flex items-center">
          <button
            type="button"
            onClick={onOpenFilter}
            className="flex items-center gap-2.5 text-xs font-medium tracking-widest text-neutral-800 hover:text-black uppercase cursor-pointer transition-colors select-none py-1.5"
            aria-label="Open Filters Sidebar"
          >
            <span>FILTER</span>
            <SlidersHorizontal className="h-4 w-4 text-neutral-700" />
            {activeFilterCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-black ml-0.5" />
            )}
          </button>
        </div>

        {/* Desktop View: Right SORT BY dropdown */}
        <div className="hidden md:flex items-center">
          <SortOptions />
        </div>
      </div>
    </div>
  );
};

export default CollectionFilterBar;
