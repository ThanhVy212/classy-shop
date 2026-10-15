import {useEffect, useRef, useState} from "react";
import {placeholderProducts} from "../constants";
import Button from "../components/Common/Button.tsx";
import { Funnel } from 'lucide-react';
import FilterSidebar from "../components/Products/FilterSidebar.tsx";
import SortOptions from "../components/Products/SortOptions.tsx";
import ProductGrid from "../components/Products/ProductGrid.tsx";


const Collection = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const sidebarRef = useRef<HTMLDivElement | null>(null);

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    }

    const handleClickOutSide = (e: MouseEvent) => {
        // Close sidebar if clicked outside
        if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
            setIsSidebarOpen(false);
        }
    };

    useEffect(() => {
        document.addEventListener("mousedown", handleClickOutSide);

        return () => {
            document.removeEventListener("mousedown", handleClickOutSide);
        };
    }, []);

    useEffect(() => {
        setTimeout(() => {
            setProducts(placeholderProducts);
        }, 1000);
    }, []);

    return (
        <div className="flex flex-col lg:flex-row">
            {/* Mobile Filter button */}
            <Button
                onClick={toggleSidebar}
                className="lg:hidden border-t border-b border-gray-300 p-2 flex justify-center items-center"
                disabled={isSidebarOpen}
            >
                <Funnel className="mr-2" /> Filters
            </Button>

            {/* Filter Sidebar */}
            <div
                ref={sidebarRef}
                className={`${isSidebarOpen 
                    ? "translate-x-0" 
                    : "-translate-x-full"} fixed inset-y-0 z-50 left-0 w-64 bg-white overflow-y-auto 
                    transition-transform duration-300 lg:static lg:translate-x-0`}
            >
                <FilterSidebar />
            </div>

            <div className="flex-grow p-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl uppercase">All Collection</h2>
                    {/* Sort Options */}
                    <SortOptions />
                </div>

                {/* Product Grid */}
                <ProductGrid products={products} />
            </div>
        </div>
    )
}
export default Collection
