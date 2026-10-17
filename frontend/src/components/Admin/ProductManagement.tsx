import { useState } from "react";
import { Link } from "react-router-dom";
import {
    Plus,
    Search,
    Edit,
    Trash2,
    ExternalLink,
    Filter,
    Package
} from "lucide-react";
import Button from "../Common/Button.tsx";
import { toast } from "sonner";

interface AdminProductItem {
    id: string;
    name: string;
    category: string;
    price: number;
    stock: number;
    image: string;
    sku: string;
}

const ProductManagement = () => {
    // Initial mock products list
    const [products, setProducts] = useState<AdminProductItem[]>([
        {
            id: "1",
            name: "Stylish Jacket",
            category: "Top Wear",
            price: 120,
            stock: 24,
            sku: "JKT-001",
            image: "https://picsum.photos/200?random=1",
        },
        {
            id: "2",
            name: "Classic White T-Shirt",
            category: "Men",
            price: 25,
            stock: 65,
            sku: "TSH-002",
            image: "https://picsum.photos/200?random=2",
        },
        {
            id: "3",
            name: "Slim Fit Denim Jeans",
            category: "Bottom Wear",
            price: 65,
            stock: 18,
            sku: "JNS-003",
            image: "https://picsum.photos/200?random=3",
        },
        {
            id: "4",
            name: "Casual Street Hoodie",
            category: "Women",
            price: 55,
            stock: 6,
            sku: "HOD-004",
            image: "https://picsum.photos/200?random=4",
        },
        {
            id: "5",
            name: "Elegant Summer Floral Dress",
            category: "Women",
            price: 85,
            stock: 0,
            sku: "DRS-005",
            image: "https://picsum.photos/200?random=5",
        },
        {
            id: "6",
            name: "Oversized Denim Shirt",
            category: "Top Wear",
            price: 70,
            stock: 32,
            sku: "SHT-006",
            image: "https://picsum.photos/200?random=6",
        },
        {
            id: "7",
            name: "Premium Knit Winter Sweater",
            category: "Top Wear",
            price: 95,
            stock: 14,
            sku: "SWT-007",
            image: "https://picsum.photos/200?random=7",
        },
        {
            id: "8",
            name: "Casual Multi-Pocket Cargo Pants",
            category: "Bottom Wear",
            price: 60,
            stock: 3,
            sku: "CRG-008",
            image: "https://picsum.photos/200?random=8",
        },
    ]);

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [stockFilter, setStockFilter] = useState("all");

    // Filter logic
    const filteredProducts = products.filter((prod) => {
        const matchesSearch =
            prod.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            prod.sku.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory =
            selectedCategory === "all" || prod.category.toLowerCase() === selectedCategory.toLowerCase();
        const matchesStock =
            stockFilter === "all" ||
            (stockFilter === "in_stock" && prod.stock > 10) ||
            (stockFilter === "low_stock" && prod.stock > 0 && prod.stock <= 10) ||
            (stockFilter === "out_of_stock" && prod.stock === 0);

        return matchesSearch && matchesCategory && matchesStock;
    });

    const handleDeleteProduct = (id: string, name: string) => {
        if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
            setProducts((prev) => prev.filter((p) => p.id !== id));
            toast.success(`Product "${name}" deleted successfully`);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="page-title">
                            Products Catalog
                        </h1>
                        <span className="badge-counter">
                            {products.length} total
                        </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage inventory, edit product details, pricing, and stock availability.
                    </p>
                </div>

                <Link to="/admin/products/new">
                    <Button className="btn-primary-action">
                        <Plus className="w-4 h-4" />
                        <span>Add New Product</span>
                    </Button>
                </Link>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-96">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search product name or SKU..."
                        className="admin-search-input"
                    />
                </div>

                <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Filter className="w-4 h-4 text-gray-400 shrink-0" />
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="admin-filter-select"
                        >
                            <option value="all">All Categories</option>
                            <option value="Men">Men</option>
                            <option value="Women">Women</option>
                            <option value="Top Wear">Top Wear</option>
                            <option value="Bottom Wear">Bottom Wear</option>
                        </select>
                    </div>

                    <select
                        value={stockFilter}
                        onChange={(e) => setStockFilter(e.target.value)}
                        className="admin-filter-select"
                    >
                        <option value="all">All Stock Status</option>
                        <option value="in_stock">In Stock (&gt;10)</option>
                        <option value="low_stock">Low Stock (1-10)</option>
                        <option value="out_of_stock">Out of Stock (0)</option>
                    </select>
                </div>
            </div>

            {/* Products Table Card */}
            <div className="card-container">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="table-head-row">
                            <tr>
                                <th className="py-3.5 px-5">Product</th>
                                <th className="py-3.5 px-5">SKU</th>
                                <th className="py-3.5 px-5">Category</th>
                                <th className="py-3.5 px-5">Price</th>
                                <th className="py-3.5 px-5">Inventory</th>
                                <th className="py-3.5 px-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredProducts.length > 0 ? (
                                filteredProducts.map((prod) => (
                                    <tr key={prod.id} className="table-row-hover">
                                        <td className="py-4 px-5">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={prod.image}
                                                    alt={prod.name}
                                                    className="w-12 h-14 object-cover rounded-xl border border-gray-200 shrink-0"
                                                />
                                                <div>
                                                    <p className="font-semibold text-gray-900 line-clamp-1">
                                                        {prod.name}
                                                    </p>
                                                    <span className="text-xs text-gray-400">
                                                        ID: #{prod.id}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-5 font-mono text-xs text-gray-500 font-semibold">
                                            {prod.sku}
                                        </td>
                                        <td className="py-4 px-5">
                                            <span className="text-xs px-2.5 py-1 bg-gray-100 rounded-lg text-gray-700 font-medium">
                                                {prod.category}
                                            </span>
                                        </td>
                                        <td className="py-4 px-5 font-bold text-gray-900">
                                            ${prod.price.toFixed(2)}
                                        </td>
                                        <td className="py-4 px-5">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`w-2 h-2 rounded-full ${
                                                        prod.stock > 10
                                                            ? "bg-emerald-500"
                                                            : prod.stock > 0
                                                            ? "bg-amber-500"
                                                            : "bg-red-500"
                                                    }`}
                                                />
                                                <span className="font-medium text-xs text-gray-800">
                                                    {prod.stock === 0 ? "Out of Stock" : `${prod.stock} in stock`}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-5 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    to={`/products/${prod.id}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="btn-action-view"
                                                    title="View in store"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </Link>

                                                <Link
                                                    to={`/admin/products/${prod.id}/edit`}
                                                    className="btn-action-edit"
                                                    title="Edit product"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Link>

                                                <button
                                                    onClick={() => handleDeleteProduct(prod.id, prod.name)}
                                                    className="btn-action-delete"
                                                    title="Delete product"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-gray-500">
                                        <Package className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                                        <p className="font-medium text-sm">No products found matching your filters</p>
                                        <button
                                            onClick={() => {
                                                setSearchTerm("");
                                                setSelectedCategory("all");
                                                setStockFilter("all");
                                            }}
                                            className="text-xs text-rabbit-red font-semibold underline mt-2 cursor-pointer"
                                        >
                                            Reset filters
                                        </button>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Table Footer */}
                <div className="table-footer">
                    <span>
                        Showing {filteredProducts.length} of {products.length} products
                    </span>
                    <span className="font-medium">ClassyShop Catalog Engine</span>
                </div>
            </div>
        </div>
    );
};

export default ProductManagement;
