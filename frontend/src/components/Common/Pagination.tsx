import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  variant?: "fill" | "transparent";
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  variant = "fill",
  className = "",
}) => {
  if (totalPages <= 0) return null;

  // Generate page numbers with ellipsis
  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }

    if (currentPage >= totalPages - 3) {
      return [
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }

    return [
      1,
      "...",
      currentPage - 1,
      currentPage,
      currentPage + 1,
      "...",
      totalPages,
    ];
  };

  const pages = getPageNumbers();
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  const handlePrev = () => {
    if (canGoPrev) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <nav
      aria-label="Pagination Navigation"
      className={`flex items-center justify-center gap-1.5 sm:gap-2 select-none ${className}`}
    >
      {/* Previous Button */}
      <button
        type="button"
        onClick={handlePrev}
        disabled={!canGoPrev}
        aria-label="Previous Page"
        className={`w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-lg flex items-center justify-center transition-colors ${
          variant === "fill"
            ? canGoPrev
              ? "bg-white border border-[#dadada] text-[#1e1e1e] hover:border-gray-400 hover:bg-gray-50 cursor-pointer"
              : "bg-white border border-[#efefef] text-[#dadada] cursor-not-allowed"
            : canGoPrev
            ? "text-[#1e1e1e] hover:bg-gray-100 cursor-pointer"
            : "text-[#dadada] cursor-not-allowed"
        }`}
      >
        <ChevronLeft className="w-5 h-5" strokeWidth={2} />
      </button>

      {/* Page Numbers */}
      {pages.map((page, index) => {
        if (typeof page === "string") {
          return (
            <span
              key={`ellipsis-${index}`}
              className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 flex items-center justify-center text-[#dadada] text-sm font-semibold select-none"
            >
              ...
            </span>
          );
        }

        const isActive = page === currentPage;

        return (
            <button
                key={page}
                type="button"
                onClick={() => onPageChange(page)}
                aria-current={isActive ? "page" : undefined}
                aria-label={`Go to page ${page}`}
                className={`w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-lg flex items-center justify-center text-sm sm:text-base font-semibold transition-all ${
                    variant === "fill"
                        ? isActive
                            ? "bg-gray-200 border border-gray-400 text-gray-700 font-bold shadow-xs cursor-default"
                            : "bg-white border border-gray-300 text-gray-800 hover:border-gray-400 hover:bg-gray-50 cursor-pointer"
                        : isActive
                            ? "text-gray-600 font-bold cursor-default"
                            : "text-gray-800 hover:bg-gray-100 cursor-pointer"
                }`}
            >
            {page}
          </button>
        );
      })}

      {/* Next Button */}
      <button
        type="button"
        onClick={handleNext}
        disabled={!canGoNext}
        aria-label="Next Page"
        className={`w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-lg flex items-center justify-center transition-colors ${
          variant === "fill"
            ? canGoNext
              ? "bg-white border border-[#dadada] text-[#1e1e1e] hover:border-gray-400 hover:bg-gray-50 cursor-pointer"
              : "bg-white border border-[#efefef] text-[#dadada] cursor-not-allowed"
            : canGoNext
            ? "text-[#1e1e1e] hover:bg-gray-100 cursor-pointer"
            : "text-[#dadada] cursor-not-allowed"
        }`}
      >
        <ChevronRight className="w-5 h-5" strokeWidth={2} />
      </button>
    </nav>
  );
};

export default Pagination;
