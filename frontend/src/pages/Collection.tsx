import { useEffect, useRef, useState, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { X } from "lucide-react";
import FilterSidebar from "../components/Products/FilterSidebar.tsx";
import CollectionFilterBar from "../components/Products/CollectionFilterBar.tsx";
import ProductGrid from "../components/Products/ProductGrid.tsx";
import Pagination from "../components/Common/Pagination.tsx";
import EmptyState from "../components/Common/EmptyState.tsx";
import { ProductGridSkeleton } from "../components/Common/Skeletons.tsx";
import { productService } from "../services/productService.ts";
import type { Product, Pagination as PaginationType } from "../types/product.ts";

const Collection = () => {
  const { collection } = useParams<{ collection: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<PaginationType>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement | null>(null);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const handlePageChange = (newPage: number) => {
    const newParams = new URLSearchParams(searchParams);
    if (newPage <= 1) {
      newParams.delete("page");
    } else {
      newParams.set("page", String(newPage));
    }
    setSearchParams(newParams);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Close sidebar on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isSidebarOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(e.target as Node)
      ) {
        setIsSidebarOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };

    if (isSidebarOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isSidebarOpen]);

  // Compute active filter count to show indicator dot
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchParams.get("category")) count += 1;
    if (searchParams.get("gender")) count += 1;
    if (searchParams.get("color")) count += 1;
    if (searchParams.get("size")) count += searchParams.get("size")!.split(",").length;
    if (searchParams.get("material")) count += searchParams.get("material")!.split(",").length;
    if (searchParams.get("brand")) count += searchParams.get("brand")!.split(",").length;
    if (searchParams.get("minPrice") && Number(searchParams.get("minPrice")) > 0) count += 1;
    if (searchParams.get("maxPrice") && Number(searchParams.get("maxPrice")) < 100) count += 1;
    return count;
  }, [searchParams]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setLoadError(false);

    const currentPage = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Number(searchParams.get("limit")) || 20;
    const sortBy = searchParams.get("sortBy") || undefined;

    const query = {
      collection:
        collection && collection.toLowerCase() !== "all"
          ? collection
          : undefined,
      category: searchParams.get("category") || undefined,
      gender: searchParams.get("gender") || undefined,
      color: searchParams.get("color") || undefined,
      size: searchParams.get("size") || undefined,
      material: searchParams.get("material") || undefined,
      brand: searchParams.get("brand") || undefined,
      minPrice: searchParams.get("minPrice") || undefined,
      maxPrice: searchParams.get("maxPrice") || undefined,
      sortBy,
      search: searchParams.get("search") || undefined,
      page: currentPage,
      limit,
    };

    productService
      .getProducts(query)
      .then((data) => {
        if (!isMounted) return;

        const list = Array.isArray(data?.products) ? data.products : [];
        setProducts(list);

        if (data?.pagination) {
          setPagination(data.pagination);
        } else {
          setPagination({
            total: list.length,
            page: currentPage,
            limit,
            totalPages: Math.max(1, Math.ceil(list.length / limit)),
            hasNextPage: currentPage * limit < list.length,
            hasPrevPage: currentPage > 1,
          });
        }
      })
      .catch((err) => {
        console.warn("Could not fetch collection products from API:", err);
        if (isMounted) {
          setProducts([]);
          setLoadError(true);
          setPagination({
            total: 0,
            page: currentPage,
            limit,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
          });
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [collection, searchParams, reloadKey]);

  return (
    <div className="relative min-h-screen bg-white">
      {/* Sticky Filter & Sort Bar (both Desktop and Mobile) */}
      <CollectionFilterBar
        onOpenFilter={toggleSidebar}
        activeFilterCount={activeFilterCount}
      />

      {/* Backdrop Overlay for Filter Sidebar (both Desktop & Mobile) */}
      <div
        onClick={closeSidebar}
        aria-hidden="true"
        className={`fixed inset-0 bg-black/50 z-[60] transition-opacity duration-300 ${
          isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Filter Sidebar Drawer (slides in from left when clicked) */}
      <aside
        ref={sidebarRef}
        aria-label="Filter sidebar"
        className={`fixed inset-y-0 left-0 z-[70] w-80 sm:w-96 max-w-[85vw] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Drawer Header matching sample */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-xs text-gray-900 tracking-widest uppercase">
              Filter
            </h3>
            {activeFilterCount > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-black inline-block" />
            )}
          </div>
          <button
            type="button"
            onClick={closeSidebar}
            className="p-1 text-gray-400 hover:text-black cursor-pointer transition-colors"
            aria-label="Close filters"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto better-scrollbar">
          <FilterSidebar onClose={closeSidebar} showSortSection={true} />
        </div>

        {/* Drawer Footer with View Products Button */}
        <div className="p-4 border-t border-gray-200 bg-white sticky bottom-0">
          <button
            type="button"
            onClick={closeSidebar}
            className="w-full bg-black text-white py-3 rounded-lg font-medium text-xs uppercase tracking-widest hover:bg-neutral-800 transition cursor-pointer"
          >
            View Products ({pagination.total})
          </button>
        </div>
      </aside>

      {/* Main Content: Collection Title & Product Grid */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Subtle Category Title and item count */}
        <div className="mb-6 flex items-baseline justify-between border-b border-gray-100 pb-3">
          <h1 className="text-xl sm:text-2xl font-light uppercase tracking-widest text-gray-900">
            {collection && collection.toLowerCase() !== "all"
              ? `${collection} Collection`
              : "All Products"}
          </h1>
          <span className="text-xs text-gray-500 uppercase tracking-wider">
            {pagination.total} {pagination.total === 1 ? "Product" : "Products"}
          </span>
        </div>

        {/* Product Grid & States */}
        {isLoading ? (
          <ProductGridSkeleton count={8} className="min-h-[350px]" />
        ) : products.length > 0 ? (
          <>
            <ProductGrid products={products} />

            {/* Pagination Component */}
            {pagination.totalPages > 1 && (
              <div className="mt-12 mb-8">
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={handlePageChange}
                  variant="fill"
                />
              </div>
            )}
          </>
        ) : loadError ? (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <EmptyState
              title="Unable to load products"
              description="We couldn't reach the catalog right now. Please try again in a moment."
              action={{
                label: "Try again",
                onClick: () => setReloadKey((current) => current + 1),
              }}
            />
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <EmptyState
              title="No products yet"
              description={
                activeFilterCount > 0
                  ? "Try adjusting your filters or search criteria to see more pieces."
                  : "This collection is still being prepared. Please check back soon for new arrivals."
              }
              action={
                activeFilterCount > 0
                  ? {
                      label: "Clear filters",
                      onClick: () => setSearchParams(new URLSearchParams()),
                    }
                  : { label: "Browse all products", to: "/collections/all" }
              }
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Collection;
