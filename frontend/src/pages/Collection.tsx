import { useEffect, useRef, useState, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { X } from "lucide-react";
import FilterSidebar from "../components/Products/FilterSidebar.tsx";
import CollectionFilterBar from "../components/Products/CollectionFilterBar.tsx";
import ProductGrid from "../components/Products/ProductGrid.tsx";
import Pagination from "../components/Common/Pagination.tsx";
import { productService } from "../services/productService.ts";
import type { Product, Pagination as PaginationType } from "../types/product.ts";
import { placeholderProducts } from "../constants";

const sortFallbackProducts = (prods: Product[], sortBy?: string | null): Product[] => {
  const list = [...prods];
  switch (sortBy) {
    case "priceAsc":
      return list.sort((a, b) => a.price - b.price);
    case "priceDesc":
      return list.sort((a, b) => b.price - a.price);
    case "titleAsc":
      return list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    case "titleDesc":
      return list.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
    case "bestSelling":
    case "popularity":
      return list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    case "featured":
      return list.sort((a, b) => Number(b.isFeatured || 0) - Number(a.isFeatured || 0));
    case "dateAsc":
      return list.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
    case "dateDesc":
    default:
      return list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }
};

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
        if (isMounted) {
          if (data && Array.isArray(data.products) && data.products.length > 0) {
            setProducts(data.products);
            if (data.pagination) {
              setPagination(data.pagination);
            } else {
              setPagination({
                total: data.products.length,
                page: currentPage,
                limit,
                totalPages: Math.max(1, Math.ceil(data.products.length / limit)),
                hasNextPage: currentPage * limit < data.products.length,
                hasPrevPage: currentPage > 1,
              });
            }
          } else {
            setProducts([]);
            setPagination({
              total: 0,
              page: currentPage,
              limit,
              totalPages: 1,
              hasNextPage: false,
              hasPrevPage: false,
            });
          }
        }
      })
      .catch((err) => {
        console.warn("Could not fetch collection products from API:", err);
        if (isMounted) {
          let fallback = sortFallbackProducts(
            placeholderProducts as unknown as Product[],
            sortBy
          );

          // Apply category / gender / color filters to fallback if present
          if (query.category) {
            fallback = fallback.filter((p) =>
              p.category?.toLowerCase().includes(query.category!.toLowerCase())
            );
          }
          if (query.gender) {
            fallback = fallback.filter(
              (p) => p.gender?.toLowerCase() === query.gender!.toLowerCase()
            );
          }
          if (query.color) {
            fallback = fallback.filter((p) =>
              p.colors?.some((c) => c.toLowerCase() === query.color!.toLowerCase())
            );
          }

          const total = fallback.length;
          const totalPages = Math.max(1, Math.ceil(total / limit));
          const start = (currentPage - 1) * limit;
          setProducts(fallback.slice(start, start + limit));
          setPagination({
            total,
            page: currentPage,
            limit,
            totalPages,
            hasNextPage: currentPage < totalPages,
            hasPrevPage: currentPage > 1,
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
  }, [collection, searchParams]);

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
          <div className="flex justify-center items-center py-24 min-h-[350px]">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black" />
          </div>
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
        ) : (
          <div className="text-center py-16 bg-gray-50 rounded-xl my-6 border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              No products found
            </h3>
            <p className="text-gray-500 text-sm">
              Try adjusting your filters or search criteria.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Collection;
