import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
    ArrowLeft,
    UploadCloud,
    X,
    Check,
    Save,
} from "lucide-react";
import Button from "../Common/Button.tsx";
import { toast } from "sonner";

const AVAILABLE_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "30", "32", "34"];
const AVAILABLE_COLORS = [
    { name: "Black", hex: "#000000" },
    { name: "White", hex: "#ffffff" },
    { name: "Red", hex: "#ef4444" },
    { name: "Blue", hex: "#3b82f6" },
    { name: "Green", hex: "#10b981" },
    { name: "Beige", hex: "#f5f5dc" },
    { name: "Gray", hex: "#6b7280" },
];

const EditProduct = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = Boolean(id);

    const [formData, setFormData] = useState(() => ({
        name: isEditMode ? "Premium Classy Jacket" : "",
        sku: isEditMode ? `PRD-00${id}` : `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
        description: isEditMode
            ? "Crafted from high-performance breathable fabric with clean tailoring for urban comfort and everyday style."
            : "",
        category: isEditMode ? "Top Wear" : "Men",
        brand: "ClassyShop",
        material: "100% Organic Cotton",
        price: isEditMode ? "120" : "",
        originalPrice: isEditMode ? "150" : "",
        stock: isEditMode ? "25" : "10",
        sizes: isEditMode ? ["S", "M", "L"] : ["M", "L"],
        colors: isEditMode ? ["Black", "Red"] : ["Black"],
        images: isEditMode
            ? [
                  "https://picsum.photos/500/500?random=1",
                  "https://picsum.photos/500/500?random=2",
              ]
            : ["https://picsum.photos/500/500?random=10"],
    }));

    const [imageUrlInput, setImageUrlInput] = useState("");

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const toggleSize = (size: string) => {
        setFormData((prev) => ({
            ...prev,
            sizes: prev.sizes.includes(size)
                ? prev.sizes.filter((s) => s !== size)
                : [...prev.sizes, size],
        }));
    };

    const toggleColor = (colorName: string) => {
        setFormData((prev) => ({
            ...prev,
            colors: prev.colors.includes(colorName)
                ? prev.colors.filter((c) => c !== colorName)
                : [...prev.colors, colorName],
        }));
    };

    const handleAddImage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!imageUrlInput.trim()) return;

        setFormData((prev) => ({
            ...prev,
            images: [...prev.images, imageUrlInput.trim()],
        }));
        setImageUrlInput("");
        toast.success("Image URL added to gallery");
    };

    const handleRemoveImage = (indexToRemove: number) => {
        setFormData((prev) => ({
            ...prev,
            images: prev.images.filter((_, idx) => idx !== indexToRemove),
        }));
    };

    const handleGenerateMockImages = () => {
        const randomId1 = Math.floor(Math.random() * 80) + 1;
        const randomId2 = Math.floor(Math.random() * 80) + 1;
        setFormData((prev) => ({
            ...prev,
            images: [
                ...prev.images,
                `https://picsum.photos/500/500?random=${randomId1}`,
                `https://picsum.photos/500/500?random=${randomId2}`,
            ],
        }));
        toast.info("Added 2 sample high-res product photos");
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim() || !formData.price) {
            toast.error("Please fill in required fields (Name and Price)");
            return;
        }

        console.log("Saving product data:", formData);
        toast.success(
            isEditMode
                ? `Product "${formData.name}" updated successfully!`
                : `New product "${formData.name}" created successfully!`
        );

        navigate("/admin/products");
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
            {/* Header & Back link */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <Link
                        to="/admin/products"
                        className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-black transition mb-2"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1.5" />
                        Back to Products List
                    </Link>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                        {isEditMode ? `Edit Product #${id}` : "Create New Product"}
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <Link to="/admin/products">
                        <button
                            type="button"
                            className="px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
                        >
                            Cancel
                        </button>
                    </Link>

                    <Button
                        type="button"
                        onClick={handleSubmit}
                        className="btn-black px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        <span>{isEditMode ? "Save Changes" : "Publish Product"}</span>
                    </Button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* 1. Basic Information */}
                <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-xs space-y-5">
                    <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">
                        Basic Information
                    </h2>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                            Product Name *
                        </label>
                        <input
                            type="text"
                            name="name"
                            required
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder="e.g. Classic Oversized Denim Jacket"
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                                SKU / Stock Keeping Unit *
                            </label>
                            <input
                                type="text"
                                name="sku"
                                required
                                value={formData.sku}
                                onChange={handleInputChange}
                                placeholder="e.g. JKT-001"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                                Brand
                            </label>
                            <input
                                type="text"
                                name="brand"
                                value={formData.brand}
                                onChange={handleInputChange}
                                placeholder="ClassyShop"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                            Description
                        </label>
                        <textarea
                            name="description"
                            rows={4}
                            value={formData.description}
                            onChange={handleInputChange}
                            placeholder="Detailed product description, fit, care instructions..."
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                        />
                    </div>
                </div>

                {/* 2. Pricing & Category & Inventory */}
                <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-xs space-y-5">
                    <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">
                        Pricing, Category &amp; Stock
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                                Selling Price ($) *
                            </label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">
                                    $
                                </span>
                                <input
                                    type="number"
                                    name="price"
                                    required
                                    min="0"
                                    step="0.01"
                                    value={formData.price}
                                    onChange={handleInputChange}
                                    placeholder="120.00"
                                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black font-semibold"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                                Original Price ($)
                            </label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">
                                    $
                                </span>
                                <input
                                    type="number"
                                    name="originalPrice"
                                    min="0"
                                    step="0.01"
                                    value={formData.originalPrice}
                                    onChange={handleInputChange}
                                    placeholder="150.00"
                                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                                Inventory Quantity *
                            </label>
                            <input
                                type="number"
                                name="stock"
                                min="0"
                                required
                                value={formData.stock}
                                onChange={handleInputChange}
                                placeholder="25"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                                Collection / Category *
                            </label>
                            <select
                                name="category"
                                value={formData.category}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black"
                            >
                                <option value="Men">Men</option>
                                <option value="Women">Women</option>
                                <option value="Top Wear">Top Wear</option>
                                <option value="Bottom Wear">Bottom Wear</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                                Fabric &amp; Material
                            </label>
                            <input
                                type="text"
                                name="material"
                                value={formData.material}
                                onChange={handleInputChange}
                                placeholder="100% Cotton, Denim, Silk"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                            />
                        </div>
                    </div>
                </div>

                {/* 3. Variants: Sizes & Colors */}
                <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-xs space-y-6">
                    <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">
                        Product Variants
                    </h2>

                    {/* Sizes Selection */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">
                            Select Available Sizes
                        </label>
                        <div className="flex flex-wrap gap-2.5">
                            {AVAILABLE_SIZES.map((size) => {
                                const selected = formData.sizes.includes(size);
                                return (
                                    <button
                                        type="button"
                                        key={size}
                                        onClick={() => toggleSize(size)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                                            selected
                                                ? "bg-black text-white border-black shadow-xs"
                                                : "bg-white text-gray-700 border-gray-300 hover:border-black"
                                        }`}
                                    >
                                        {size}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Colors Selection */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">
                            Select Available Colors
                        </label>
                        <div className="flex flex-wrap gap-3">
                            {AVAILABLE_COLORS.map((col) => {
                                const selected = formData.colors.includes(col.name);
                                return (
                                    <button
                                        type="button"
                                        key={col.name}
                                        onClick={() => toggleColor(col.name)}
                                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                                            selected
                                                ? "border-black bg-gray-50 ring-1 ring-black"
                                                : "border-gray-200 hover:border-gray-400 bg-white"
                                        }`}
                                    >
                                        <span
                                            className="w-3.5 h-3.5 rounded-full border border-gray-300 shrink-0"
                                            style={{ backgroundColor: col.hex }}
                                        />
                                        <span>{col.name}</span>
                                        {selected && <Check className="w-3.5 h-3.5 text-black" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* 4. Product Gallery */}
                <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-xs space-y-6">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <h2 className="text-lg font-bold text-gray-900">Product Images Gallery</h2>
                    </div>

                    {/* Image URL input */}
                    <div className="flex gap-2">
                        <input
                            type="url"
                            value={imageUrlInput}
                            onChange={(e) => setImageUrlInput(e.target.value)}
                            placeholder="Paste high-res image URL (e.g. https://...)"
                            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                        />
                        <button
                            type="button"
                            onClick={handleAddImage}
                            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-xl transition cursor-pointer"
                        >
                            Add Image
                        </button>
                    </div>

                    {/* Image Thumbnails Gallery */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4 pt-2">
                        {formData.images.map((imgUrl, index) => (
                            <div
                                key={index}
                                className="group relative aspect-square rounded-2xl overflow-hidden border border-gray-200 bg-gray-50"
                            >
                                <img
                                    src={imgUrl}
                                    alt={`Product preview ${index + 1}`}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                {index === 0 && (
                                    <span className="absolute top-2 left-2 bg-black text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                                        Cover
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={() => handleRemoveImage(index)}
                                    className="absolute top-2 right-2 p-1.5 rounded-full bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-sm hover:bg-red-700"
                                    title="Delete photo"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}

                        {/* Drop / Add Placeholder */}
                        <div
                            onClick={handleGenerateMockImages}
                            className="aspect-square rounded-2xl border-2 border-dashed border-gray-300 hover:border-black flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-colors bg-gray-50/50 hover:bg-gray-50"
                        >
                            <UploadCloud className="w-6 h-6 text-gray-400 mb-1" />
                            <span className="text-xs font-semibold text-gray-700">Add More</span>
                            <span className="text-[10px] text-gray-400">or click to sample</span>
                        </div>
                    </div>
                </div>

                {/* Form Action Submit */}
                <div className="flex items-center justify-end gap-3 pt-4">
                    <Link to="/admin/products">
                        <button
                            type="button"
                            className="px-5 py-3 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
                        >
                            Cancel
                        </button>
                    </Link>

                    <Button
                        type="submit"
                        className="btn-black px-8 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm"
                    >
                        <Save className="w-4 h-4" />
                        <span>{isEditMode ? "Save Changes" : "Create Product"}</span>
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default EditProduct;
