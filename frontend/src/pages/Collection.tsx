import { useEffect, useRef, useState } from "react";
import { placeholderProducts } from "../constants";
import Button from "../components/Common/Button.tsx";
import { Funnel, X } from "lucide-react";
import FilterSidebar from "../components/Products/FilterSidebar.tsx";
import SortOptions from "../components/Products/SortOptions.tsx";
import ProductGrid from "../components/Products/ProductGrid.tsx";

const Collection = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const sidebarRef = useRef<HTMLDivElement | null>(null);

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const closeSidebar = () => {
        setIsSidebarOpen(false);
    };

    const handleClickOutSide = (e: MouseEvent) => {
        // Close sidebar if clicked outside on mobile
        if (isSidebarOpen && sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
            setIsSidebarOpen(false);
        }
    };

    useEffect(() => {
        if (isSidebarOpen) {
            document.addEventListener("mousedown", handleClickOutSide);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutSide);
        };
    }, [isSidebarOpen]);

    useEffect(() => {
        setTimeout(() => {
            setProducts(placeholderProducts);
        }, 1000);
    }, []);

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
                    <Button onClick={closeSidebar} className="cursor-pointer" aria-label="Close filters">
                        <X className="h-5 w-5 text-gray-600 hover:text-black" />
                    </Button>
                </div>

                <FilterSidebar />
            </div>

            <div className="flex-grow p-4 min-w-0">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl uppercase">All Collection</h2>
                    {/* Sort Options */}
                    <SortOptions />
                </div>

                {/* Product Grid */}
                <ProductGrid products={products} />
            </div>
        </div>
    );
};

export default Collection;
