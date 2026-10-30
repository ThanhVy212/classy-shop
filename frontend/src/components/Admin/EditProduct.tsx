import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
    ArrowLeft,
    UploadCloud,
    X,
    Check,
    Save,
    Loader2,
} from "lucide-react";
import Button from "../Common/Button.tsx";
import { toast } from "sonner";
import { productService } from "../../services/productService.ts";
import { uploadService } from "../../services/uploadService.ts";
import { getColorStyle, getColorHex } from "../../utils/colors.ts";

const AVAILABLE_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "30", "32", "34"];
const AVAILABLE_CATEGORIES = [
    "Top Wear",
    "Bottom Wear",
    "Outerwear",
    "Dresses",
];
const AVAILABLE_GENDERS = ["Men", "Women", "Unisex"] as const;

const AVAILABLE_COLORS = [
    { name: "Black", hex: "#000000" },
    { name: "White", hex: "#ffffff" },
    { name: "Red", hex: "#ef4444" },
    { name: "Blue", hex: "#2563eb" },
    { name: "Navy Blue", hex: "#001f3f" },
    { name: "Navy", hex: "#000080" },
    { name: "Burgundy", hex: "#800020" },
    { name: "Light Blue", hex: "#93c5fd" },
    { name: "Dark Blue", hex: "#172554" },
    { name: "Green", hex: "#10b981" },
    { name: "Dark Green", hex: "#14532d" },
    { name: "Olive", hex: "#556b2f" },
    { name: "Yellow", hex: "#eab308" },
    { name: "Gray", hex: "#6b7280" },
    { name: "Charcoal", hex: "#374151" },
    { name: "Beige", hex: "#d4b996" },
    { name: "Brown", hex: "#78350f" },
    { name: "Pink", hex: "#ec4899" },
    { name: "Khaki", hex: "#c3b091" },
    { name: "Lavender", hex: "#c084fc" },
    { name: "Champagne", hex: "#f7e7ce" },
    { name: "Cream", hex: "#fffdd0" },
];

const EditProduct = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = Boolean(id);

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);

    const [formData, setFormData] = useState(() => ({
        name: isEditMode ? "Premium Classy Jacket" : "",
        sku: isEditMode ? `PRD-00${id}` : `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
        description: isEditMode
            ? "Crafted from high-performance breathable fabric with clean tailoring for urban comfort and everyday style."
            : "",
        category: "Top Wear",
        gender: "Men",
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
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isEditMode && id) {
            productService
                .getProductById(id)
                .then((prod) => {
                    if (prod) {
                        setFormData({
                            name: prod.name || "",
                            sku: prod.sku || "",
                            description: prod.description || "",
                            category: prod.category || "Top Wear",
                            gender: prod.gender || "Men",
                            brand: prod.brand || "ClassyShop",
                            material: prod.material || "100% Organic Cotton",
                            price: prod.price !== undefined ? String(prod.price) : "",
                            originalPrice:
                                prod.discountPrice !== undefined ? String(prod.discountPrice) : "",
                            stock:
                                prod.countInStock !== undefined
                                    ? String(prod.countInStock)
                                    : "10",
                            sizes: prod.sizes && prod.sizes.length > 0 ? prod.sizes : ["M"],
                            colors:
                                prod.colors && prod.colors.length > 0 ? prod.colors : ["Black"],
                            images:
                                prod.images && prod.images.length > 0
                                    ? prod.images.map((img) => img.url)
                                    : prod.image
                                    ? [prod.image]
                                    : [],
                        });
                    }
                })
                .catch((err) => {
                    console.warn("Could not fetch product for edit:", err);
                });
        }
    }, [isEditMode, id]);

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

    const displayedColors = React.useMemo(() => {
        const list = [...AVAILABLE_COLORS];
        formData.colors.forEach((c) => {
            if (!list.some((item) => item.name.toLowerCase() === c.toLowerCase())) {
                list.push({ name: c, hex: getColorHex(c) });
            }
        });
        return list;
    }, [formData.colors]);

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

    const handleTriggerFileInput = () => {
        if (isUploadingImage) return;
        fileInputRef.current?.click();
    };

    const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const fileArray = Array.from(files);
        setIsUploadingImage(true);
        const toastId = toast.loading(`Uploading ${fileArray.length} image(s)...`);

        try {
            const uploaded = await uploadService.uploadMultipleImages(fileArray);
            const newUrls = uploaded.map((img) => img.url).filter(Boolean);

            if (newUrls.length > 0) {
                setFormData((prev) => ({
                    ...prev,
                    images: [...prev.images, ...newUrls],
                }));
                toast.success(`Uploaded ${newUrls.length} image(s) successfully!`, {
                    id: toastId,
                });
            } else {
                toast.error("Failed to upload images.", { id: toastId });
            }
        } catch (error: unknown) {
            console.error("Upload images error:", error);
            const errResponse = (error as { response?: { data?: { message?: string } } })?.response;
            const message = errResponse?.data?.message || "Failed to upload image from machine. Please try again.";
            toast.error(message, { id: toastId });
        } finally {
            setIsUploadingImage(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim() || !formData.price) {
            toast.error("Please fill in required fields (Name and Price)");
            return;
        }

        setIsSaving(true);
        try {
            const productPayload = {
                name: formData.name.trim(),
                sku: formData.sku.trim() || `SKU-${Date.now()}`,
                description: formData.description.trim() || formData.name.trim(),
                category: formData.category,
                gender: formData.gender,
                brand: formData.brand.trim() || "ClassyShop",
                material: formData.material.trim() || "Cotton",
                price: Number(formData.price) || 0,
                discountPrice: formData.originalPrice ? Number(formData.originalPrice) : undefined,
                countInStock: Number(formData.stock) || 0,
                sizes: formData.sizes.length > 0 ? formData.sizes : ["M"],
                colors: formData.colors.length > 0 ? formData.colors : ["Black"],
                collections: "Business Casual",
                images: formData.images.map((url) => ({ url, altText: formData.name })),
                isPublished: true,
            };

            if (isEditMode && id) {
                await productService.updateProduct(id, productPayload);
                toast.success(`Product "${formData.name}" updated successfully!`);
            } else {
                await productService.createProduct(productPayload);
                toast.success(`New product "${formData.name}" created successfully!`);
            }

            navigate("/admin/products");
        } catch (error) {
            console.error("Save product error:", error);
            toast.error("Failed to save product. Please try again.");
        } finally {
            setIsSaving(false);
        }
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
                    <h1 className="page-title">
                        {isEditMode ? `Edit Product #${id}` : "Create New Product"}
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <Link to="/admin/products">
                        <button
                            type="button"
                            className="btn-outline"
                        >
                            Cancel
                        </button>
                    </Link>

                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSaving || isUploadingImage}
                        className="btn-primary-action px-5 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        <Save className="w-4 h-4" />
                        <span>
                            {isSaving
                                ? "Saving..."
                                : isEditMode
                                ? "Save Changes"
                                : "Publish Product"}
                        </span>
                    </Button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* 1. Basic Information */}
                <div className="card-padded space-y-5">
                    <h2 className="card-title border-b border-gray-100 pb-3">
                        Basic Information
                    </h2>

                    <div>
                        <label className="form-label">
                            Product Name *
                        </label>
                        <input
                            type="text"
                            name="name"
                            required
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder="e.g. Classic Oversized Denim Jacket"
                            className="form-input"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="form-label">
                                SKU / Stock Keeping Unit *
                            </label>
                            <input
                                type="text"
                                name="sku"
                                required
                                value={formData.sku}
                                onChange={handleInputChange}
                                placeholder="e.g. JKT-001"
                                className="form-input font-mono"
                            />
                        </div>

                        <div>
                            <label className="form-label">
                                Brand
                            </label>
                            <input
                                type="text"
                                name="brand"
                                value={formData.brand}
                                onChange={handleInputChange}
                                placeholder="ClassyShop"
                                className="form-input"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="form-label">
                            Description
                        </label>
                        <textarea
                            name="description"
                            rows={4}
                            value={formData.description}
                            onChange={handleInputChange}
                            placeholder="Detailed product description, fit, care instructions..."
                            className="form-input"
                        />
                    </div>
                </div>

                {/* 2. Pricing & Category & Inventory */}
                <div className="card-padded space-y-5">
                    <h2 className="card-title border-b border-gray-100 pb-3">
                        Pricing, Category, Gender &amp; Stock
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        <div>
                            <label className="form-label">
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
                            <label className="form-label">
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
                            <label className="form-label">
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
                                className="form-input"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-2">
                        {/* Category Selection */}
                        <div>
                            <label className="form-label">
                                Category *
                            </label>
                            <select
                                name="category"
                                value={formData.category}
                                onChange={handleInputChange}
                                className="form-select"
                            >
                                {AVAILABLE_CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Gender Target Selection */}
                        <div>
                            <label className="form-label">
                                Gender Target *
                            </label>
                            <select
                                name="gender"
                                value={formData.gender}
                                onChange={handleInputChange}
                                className="form-select font-medium"
                            >
                                {AVAILABLE_GENDERS.map((g) => (
                                    <option key={g} value={g}>
                                        {g}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Material */}
                        <div>
                            <label className="form-label">
                                Fabric &amp; Material
                            </label>
                            <input
                                type="text"
                                name="material"
                                value={formData.material}
                                onChange={handleInputChange}
                                placeholder="100% Cotton, Denim, Silk"
                                className="form-input"
                            />
                        </div>
                    </div>
                </div>

                {/* 3. Variants: Sizes & Colors */}
                <div className="card-padded space-y-6">
                    <h2 className="card-title border-b border-gray-100 pb-3">
                        Product Variants
                    </h2>

                    {/* Sizes Selection */}
                    <div>
                        <label className="form-label mb-2">
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
                        <label className="form-label mb-2">
                            Select Available Colors
                        </label>
                        <div className="flex flex-wrap gap-3">
                            {displayedColors.map((col) => {
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
                                            style={getColorStyle(col.name || col.hex)}
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
                <div className="card-padded space-y-6">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <div>
                            <h2 className="card-title">Product Images Gallery</h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Click &quot;Add More&quot; to upload images directly from your computer or paste image URLs.
                            </p>
                        </div>
                    </div>

                    {/* Hidden Native File Input for Upload */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileInputChange}
                        className="hidden"
                    />

                    {/* Image URL input */}
                    <div className="flex gap-2">
                        <input
                            type="url"
                            value={imageUrlInput}
                            onChange={(e) => setImageUrlInput(e.target.value)}
                            placeholder="Paste image URL (optional, e.g. https://...)"
                            className="form-input flex-1"
                        />
                        <button
                            type="button"
                            onClick={handleAddImage}
                            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-xl transition cursor-pointer"
                        >
                            Add URL
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

                        {/* Add More from Device Box */}
                        <div
                            onClick={handleTriggerFileInput}
                            className={`aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-colors ${
                                isUploadingImage
                                    ? "border-black bg-gray-100 cursor-not-allowed opacity-75"
                                    : "border-gray-300 hover:border-black bg-gray-50/50 hover:bg-gray-50"
                            }`}
                            title="Click to upload images from your computer"
                        >
                            {isUploadingImage ? (
                                <>
                                    <Loader2 className="w-6 h-6 text-black animate-spin mb-1.5" />
                                    <span className="text-xs font-semibold text-gray-700">Uploading...</span>
                                </>
                            ) : (
                                <>
                                    <UploadCloud className="w-6 h-6 text-gray-500 mb-1.5" />
                                    <span className="text-xs font-semibold text-gray-700">Add More</span>
                                </>
                            )}
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
                        disabled={isSaving || isUploadingImage}
                        className="btn-black px-8 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        <Save className="w-4 h-4" />
                        <span>
                            {isSaving
                                ? "Saving..."
                                : isEditMode
                                ? "Save Changes"
                                : "Create Product"}
                        </span>
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default EditProduct;
