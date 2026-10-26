import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import Button from "../components/Common/Button.tsx";
import { Funnel, X } from "lucide-react";
import FilterSidebar from "../components/Products/FilterSidebar.tsx";
import SortOptions from "../components/Products/SortOptions.tsx";
import ProductGrid from "../components/Products/ProductGrid.tsx";
import Pagination from "../components/Common/Pagination.tsx";
import { productService } from "../services/productService.ts";
import type { Product, Pagination as PaginationType } from "../types/product.ts";
import { placeholderProducts } from "../constants";

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
    setIsSidebarOpen(!isSidebarOpen);
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

  useEffect(() => {
    const handleClickOutSide = (e: MouseEvent) => {
      if (
        isSidebarOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(e.target as Node)
      ) {
        setIsSidebarOpen(false);
      }
    };

    if (isSidebarOpen) {
      document.addEventListener("mousedown", handleClickOutSide);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutSide);
    };
  }, [isSidebarOpen]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const currentPage = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Number(searchParams.get("limit")) || 20;

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
      sortBy: searchParams.get("sortBy") || undefined,
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
          const fallback = placeholderProducts as unknown as Product[];
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
    <div className="flex flex-col lg:flex-row relative">
      {/* Mobile Filter button */}
      <div className="lg:hidden border-t border-b border-gray-300 p-2 flex justify-center items-center">
        <Button
          onClick={toggleSidebar}
          className="flex justify-center items-center text-sm font-medium py-1 px-4 cursor-pointer"
        >
          <Funnel className="mr-2 h-4 w-4" /> Filters
        </Button>
      </div>

      {/* Mobile Backdrop Overlay */}
      {isSidebarOpen && (
        <div
          onClick={closeSidebar}
          className="fixed inset-0 bg-black/50 z-[60] lg:hidden transition-opacity duration-300"
        />
      )}

      {/* Filter Sidebar */}
      <div
        ref={sidebarRef}
        className={`${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } fixed inset-y-0 left-0 z-[70] w-72 bg-white overflow-y-auto better-scrollbar shadow-2xl transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 lg:z-10 lg:w-64 lg:shadow-none lg:shrink-0 lg:sticky lg:top-[68px] lg:self-start lg:max-h-[calc(100vh-80px)]`}
      >
        {/* Mobile Drawer Close Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 lg:hidden">
          <h3 className="font-semibold text-lg text-gray-800">Filters</h3>
          <Button
            onClick={closeSidebar}
            className="cursor-pointer"
            aria-label="Close filters"
          >
            <X className="h-5 w-5 text-gray-600 hover:text-black" />
          </Button>
        </div>

        <FilterSidebar />
      </div>

      <div className="flex-grow p-4 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl uppercase">
            {collection && collection.toLowerCase() !== "all"
              ? `${collection} Collection`
              : "All Collection"}
          </h2>
          {/* Sort Options */}
          <SortOptions />
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
          <div className="text-center py-16 bg-gray-50 rounded-xl my-6">
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
