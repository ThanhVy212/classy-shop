import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
    ArrowLeft,
    UploadCloud,
    X,
    Check,
    Save,
    Loader2,
    Boxes,
    Plus,
    Star,
} from "lucide-react";
import Button from "../Common/Button.tsx";
import { toast } from "sonner";
import { productService } from "../../services/productService.ts";
import { uploadService } from "../../services/uploadService.ts";
import { getColorStyle, getColorHex } from "../../utils/colors.ts";
import TaxonomySelect from "./TaxonomySelect.tsx";
import type { ProductVariant } from "../../types/product.ts";

const AVAILABLE_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "30", "32", "34"];
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

const variantKeyOf = (size: string, color: string) =>
    `${size.trim().toLowerCase()}::${color.trim().toLowerCase()}`;

const buildVariantSku = (baseSku: string, size: string, color: string) => {
    const base = (baseSku || "SKU").trim().toUpperCase();
    const suffix = `${size}-${color}`
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .toUpperCase();

    return suffix ? `${base}-${suffix}` : base;
};

const buildVariantMatrix = (
    sizes: string[],
    colors: string[],
    existingVariants: ProductVariant[],
    baseSku: string,
): ProductVariant[] => {
    const existing = new Map(
        existingVariants.map((variant) => [
            variantKeyOf(variant.size, variant.color),
            variant,
        ]),
    );

    return sizes.flatMap((size) =>
        colors.map((color) => {
            const current = existing.get(variantKeyOf(size, color));

            return {
                size,
                color,
                stock: current ? current.stock : 0,
                sku: current?.sku || buildVariantSku(baseSku, size, color),
            };
        }),
    );
};

/** Spread an old product-level stock across the new variant rows. */
const distributeVariantStock = (
    variants: ProductVariant[],
    total: number,
): ProductVariant[] => {
    if (variants.length === 0) return variants;

    const safeTotal = Math.max(0, Math.floor(Number(total) || 0));
    const baseShare = Math.floor(safeTotal / variants.length);
    let remainder = safeTotal - baseShare * variants.length;

    return variants.map((variant) => {
        const extra = remainder > 0 ? 1 : 0;
        if (extra) remainder -= 1;

        return { ...variant, stock: baseShare + extra };
    });
};

const EditProduct = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = Boolean(id);

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const colorFileInputRef = useRef<HTMLInputElement | null>(null);
    const colorUploadTargetRef = useRef<string | null>(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [uploadingColor, setUploadingColor] = useState<string | null>(null);

    const [formData, setFormData] = useState(() => {
        const initialSku = isEditMode
            ? `PRD-00${id}`
            : `SKU-${Math.floor(1000 + Math.random() * 9000)}`;
        const initialSizes = isEditMode ? ["S", "M", "L"] : ["M", "L"];
        const initialColors = isEditMode ? ["Black", "Red"] : ["Black"];

        return {
            name: isEditMode ? "Premium Classy Jacket" : "",
            sku: initialSku,
            description: isEditMode
                ? "Crafted from high-performance breathable fabric with clean tailoring for urban comfort and everyday style."
                : "",
            category: "",
            gender: "Men",
            brand: "",
            material: "",
            price: isEditMode ? "120" : "",
            originalPrice: isEditMode ? "150" : "",
            stock: isEditMode ? "25" : "10",
            sizes: initialSizes,
            colors: initialColors,
            variants: buildVariantMatrix(
                initialSizes,
                initialColors,
                [],
                initialSku,
            ),
            images: [] as string[],
            colorImages: {} as Record<string, string>,
        };
    });

    const [imageUrlInput, setImageUrlInput] = useState("");
    const [colorUrlInputs, setColorUrlInputs] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isEditMode && id) {
            productService
                .getProductById(id)
                .then((prod) => {
                    if (prod) {
                        const nextSizes =
                            prod.sizes && prod.sizes.length > 0 ? prod.sizes : ["M"];
                        const nextColors =
                            prod.colors && prod.colors.length > 0 ? prod.colors : ["Black"];
                        const existingVariants = (prod.variants ?? []).map((variant) => ({
                            size: variant.size,
                            color: variant.color,
                            stock: Math.max(0, Math.floor(Number(variant.stock) || 0)),
                            sku: variant.sku ?? "",
                        }));
                        const variantRows =
                            existingVariants.length > 0
                                ? buildVariantMatrix(
                                      nextSizes,
                                      nextColors,
                                      existingVariants,
                                      prod.sku || "",
                                  )
                                : distributeVariantStock(
                                      buildVariantMatrix(
                                          nextSizes,
                                          nextColors,
                                          [],
                                          prod.sku || "",
                                      ),
                                      Number(prod.countInStock) || 0,
                                  );

                        const colorImageMap: Record<string, string> = {};
                        (prod.colorImages ?? []).forEach((entry) => {
                            const color = String(entry?.color ?? "").trim();
                            const url = entry?.images?.[0]?.url;
                            if (color && url) {
                                colorImageMap[color] = url;
                            }
                        });

                        setFormData({
                            name: prod.name || "",
                            sku: prod.sku || "",
                            description: prod.description || "",
                            category: prod.category || "",
                            gender: prod.gender || "Men",
                            brand: prod.brand || "",
                            material: prod.material || "",
                            price: prod.price !== undefined ? String(prod.price) : "",
                            originalPrice:
                                prod.discountPrice !== undefined ? String(prod.discountPrice) : "",
                            stock:
                                prod.countInStock !== undefined
                                    ? String(prod.countInStock)
                                    : "10",
                            sizes: nextSizes,
                            colors: nextColors,
                            variants: variantRows,
                            images:
                                prod.images && prod.images.length > 0
                                    ? prod.images.map((img) => img.url)
                                    : prod.image
                                    ? [prod.image]
                                    : [],
                            colorImages: colorImageMap,
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
        setFormData((prev) => {
            const sizes = prev.sizes.includes(size)
                ? prev.sizes.filter((s) => s !== size)
                : [...prev.sizes, size];

            return {
                ...prev,
                sizes,
                variants: buildVariantMatrix(
                    sizes,
                    prev.colors,
                    prev.variants,
                    prev.sku,
                ),
            };
        });
    };

    const toggleColor = (colorName: string) => {
        setFormData((prev) => {
            const removing = prev.colors.includes(colorName);
            const colors = removing
                ? prev.colors.filter((c) => c !== colorName)
                : [...prev.colors, colorName];

            const colorImages = removing
                ? Object.fromEntries(
                      Object.entries(prev.colorImages).filter(
                          ([color]) => color !== colorName,
                      ),
                  )
                : prev.colorImages;

            return {
                ...prev,
                colors,
                colorImages,
                variants: buildVariantMatrix(
                    prev.sizes,
                    colors,
                    prev.variants,
                    prev.sku,
                ),
            };
        });
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

    const variantTotalStock = formData.variants.reduce(
        (total, variant) => total + Math.max(0, Math.floor(Number(variant.stock) || 0)),
        0,
    );

    const updateVariant = (index: number, patch: Partial<ProductVariant>) => {
        setFormData((prev) => ({
            ...prev,
            variants: prev.variants.map((variant, variantIndex) =>
                variantIndex === index ? { ...variant, ...patch } : variant,
            ),
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
        setFormData((prev) => {
            const removedUrl = prev.images[indexToRemove];
            const images = prev.images.filter((_, idx) => idx !== indexToRemove);

            // Keep color assignments in sync: an image that no longer exists in
            // the product gallery must not be used as a color's main image.
            const colorImages = Object.fromEntries(
                Object.entries(prev.colorImages).filter(
                    ([, url]) => url !== removedUrl,
                ),
            );

            return { ...prev, images, colorImages };
        });
    };

    const handleSetCoverImage = (index: number) => {
        if (index === 0) return;

        setFormData((prev) => {
            const images = [...prev.images];
            const [cover] = images.splice(index, 1);
            images.unshift(cover);

            return { ...prev, images };
        });
        toast.success("Cover image updated");
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

    const assignImageToColor = (color: string, url: string) => {
        setFormData((prev) => ({
            ...prev,
            colorImages: { ...prev.colorImages, [color]: url },
        }));
    };

    const unassignImageFromColor = (color: string) => {
        setFormData((prev) => {
            const colorImages = { ...prev.colorImages };
            delete colorImages[color];

            return { ...prev, colorImages };
        });
    };

    const handleColorUrlInputChange = (color: string, value: string) => {
        setColorUrlInputs((prev) => ({ ...prev, [color]: value }));
    };

    const handleAddColorImageUrl = (color: string) => {
        const url = (colorUrlInputs[color] ?? "").trim();
        if (!url) return;

        setFormData((prev) => {
            const gallery = prev.images.includes(url)
                ? prev.images
                : [...prev.images, url];

            return {
                ...prev,
                images: gallery,
                colorImages: { ...prev.colorImages, [color]: url },
            };
        });
        setColorUrlInputs((prev) => ({ ...prev, [color]: "" }));
        toast.success(`Main image set for ${color}`);
    };

    const handleTriggerColorFileInput = (color: string) => {
        if (isUploadingImage || uploadingColor) return;
        colorUploadTargetRef.current = color;
        colorFileInputRef.current?.click();
    };

    const handleColorFileInputChange = async (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const files = e.target.files;
        const color = colorUploadTargetRef.current;
        if (!files || files.length === 0 || !color) return;

        const file = files[0];
        setUploadingColor(color);
        const toastId = toast.loading(`Uploading image for ${color}...`);

        try {
            const uploaded = await uploadService.uploadMultipleImages([file]);
            const newUrl = uploaded[0]?.url;

            if (newUrl) {
                setFormData((prev) => {
                    const gallery = prev.images.includes(newUrl)
                        ? prev.images
                        : [...prev.images, newUrl];

                    return {
                        ...prev,
                        images: gallery,
                        colorImages: { ...prev.colorImages, [color]: newUrl },
                    };
                });
                toast.success(`Main image set for ${color}!`, { id: toastId });
            } else {
                toast.error("Failed to upload image.", { id: toastId });
            }
        } catch (error: unknown) {
            console.error("Upload color image error:", error);
            const errResponse = (error as { response?: { data?: { message?: string } } })?.response;
            const message =
                errResponse?.data?.message ||
                "Failed to upload image from machine. Please try again.";
            toast.error(message, { id: toastId });
        } finally {
            setUploadingColor(null);
            colorUploadTargetRef.current = null;
            if (colorFileInputRef.current) {
                colorFileInputRef.current.value = "";
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim() || !formData.price) {
            toast.error("Please fill in required fields (Name and Price)");
            return;
        }

        if (!formData.category) {
            toast.error("Please select a category for this product");
            return;
        }

        if (formData.sizes.length === 0 || formData.colors.length === 0) {
            toast.error(
                "Select at least one size and one color so every variant can track stock.",
            );
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
                brand: formData.brand.trim() || undefined,
                material: formData.material.trim() || undefined,
                price: Number(formData.price) || 0,
                discountPrice: formData.originalPrice ? Number(formData.originalPrice) : undefined,
                countInStock: variantTotalStock,
                sizes: formData.sizes,
                colors: formData.colors,
                variants: formData.variants.map((variant) => ({
                    size: variant.size,
                    color: variant.color,
                    stock: Math.max(0, Math.floor(Number(variant.stock) || 0)),
                    sku: variant.sku?.trim() || "",
                })),
                collections: "Business Casual",
                images: formData.images.map((url) => ({ url, altText: formData.name })),
                colorImages: formData.colors
                    .map((color) => {
                        const url = formData.colorImages[color];

                        return {
                            color,
                            images: url
                                ? [
                                      {
                                          url,
                                          altText: `${formData.name} - ${color}`,
                                      },
                                  ]
                                : [],
                        };
                    })
                    .filter((entry) => entry.images.length > 0),
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
                        <Button
                            type="button"
                            className="btn-outline"
                        >
                            Cancel
                        </Button>
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
                            <TaxonomySelect
                                type="brand"
                                label="Brand"
                                value={formData.brand}
                                onChange={(value) =>
                                    setFormData((prev) => ({ ...prev, brand: value }))
                                }
                                placeholder="Select brand"
                                disabled={isSaving || isUploadingImage}
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
                                Total Inventory (from variants)
                            </label>
                            <input
                                type="number"
                                name="stock"
                                min="0"
                                value={String(variantTotalStock)}
                                readOnly
                                placeholder="0"
                                className="form-input bg-gray-100 text-gray-700 cursor-not-allowed"
                            />
                            <p className="mt-1.5 text-[11px] text-gray-500">
                                {formData.variants.length > 0
                                    ? `Sum of ${formData.variants.length} variant row${
                                          formData.variants.length === 1 ? "" : "s"
                                      } below. Edit stock per size/color there.`
                                    : "Select at least one size and one color to create variant rows."}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-2">
                        {/* Category Selection */}
                        <div>
                            <TaxonomySelect
                                type="category"
                                label="Category"
                                value={formData.category}
                                onChange={(value) =>
                                    setFormData((prev) => ({ ...prev, category: value }))
                                }
                                required
                                placeholder="Select category"
                                disabled={isSaving || isUploadingImage}
                            />
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
                            <TaxonomySelect
                                type="material"
                                label="Fabric & Material"
                                value={formData.material}
                                onChange={(value) =>
                                    setFormData((prev) => ({ ...prev, material: value }))
                                }
                                placeholder="Select material"
                                disabled={isSaving || isUploadingImage}
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
                                    <Button
                                        type="button"
                                        key={size}
                                        aria-pressed={selected}
                                        onClick={() => toggleSize(size)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition border ${
                                            selected
                                                ? "bg-black text-white border-black shadow-xs"
                                                : "bg-white text-gray-700 border-gray-300 hover:border-black"
                                        }`}
                                    >
                                        {size}
                                    </Button>
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
                                    <Button
                                        type="button"
                                        key={col.name}
                                        aria-pressed={selected}
                                        onClick={() => toggleColor(col.name)}
                                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
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
                                    </Button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Per-combination stock */}
                    <div className="rounded-2xl border border-gray-200 bg-gray-50/40 p-4 sm:p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                                    <Boxes className="w-4 h-4" />
                                    Stock by size &amp; color
                                </h3>
                                <p className="mt-1 max-w-2xl text-xs leading-relaxed text-gray-500">
                                    {formData.variants.length > 0
                                        ? `${formData.variants.length} combinations · ${variantTotalStock} units in total. Enter the stock for every combination; use 0 when it is sold out.`
                                        : "Select at least one size and one color above. A stock row is created automatically for every combination."}
                                </p>
                            </div>

                            {formData.variants.length > 0 && (
                                <span className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700">
                                    <Boxes className="w-3.5 h-3.5" />
                                    {variantTotalStock} units
                                </span>
                            )}
                        </div>

                        {formData.variants.length > 0 ? (
                            <div className="mt-4 space-y-2">
                                <div className="hidden grid-cols-[1fr_1.5fr_7rem] gap-3 px-3 text-[11px] font-bold uppercase tracking-wide text-gray-500 sm:grid">
                                    <span>Size / Color</span>
                                    <span>Variant SKU</span>
                                    <span className="text-right">Stock *</span>
                                </div>

                                {formData.variants.map((variant, index) => (
                                    <div
                                        key={`${variant.size}-${variant.color}`}
                                        className="grid grid-cols-1 gap-2 rounded-xl border border-gray-200 bg-white p-3 sm:grid-cols-[1fr_1.5fr_7rem] sm:items-center sm:gap-3"
                                    >
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-bold text-gray-900">
                                                {variant.size}
                                            </span>
                                            <span className="flex items-center gap-1.5 font-medium text-gray-600">
                                                <span
                                                    className="h-3 w-3 shrink-0 rounded-full border border-gray-300"
                                                    style={getColorStyle(variant.color || "#ffffff")}
                                                />
                                                {variant.color}
                                            </span>
                                        </div>

                                        <input
                                            type="text"
                                            value={variant.sku ?? ""}
                                            onChange={(event) =>
                                                updateVariant(index, { sku: event.target.value })
                                            }
                                            placeholder="Variant SKU"
                                            className="form-input py-2 font-mono text-xs"
                                        />

                                        <div className="flex items-center justify-between gap-2 sm:justify-end">
                                            <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 sm:hidden">
                                                Stock *
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                required
                                                value={variant.stock}
                                                onChange={(event) =>
                                                    updateVariant(index, {
                                                        stock: Math.max(
                                                            0,
                                                            Math.floor(Number(event.target.value) || 0),
                                                        ),
                                                    })
                                                }
                                                className="form-input w-24 py-2 text-right text-sm"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="mt-3 text-xs leading-relaxed text-gray-500">
                                Choose at least one size and one color above. Stock rows appear
                                automatically for every size × color combination.
                            </p>
                        )}
                    </div>
                </div>

                {/* 4. Product Gallery */}
                <div className="card-padded space-y-6">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <div>
                            <h2 className="card-title">Product Images Gallery</h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Click &quot;Add More&quot; to upload images directly from your computer or paste image URLs. Hover any image and click &quot;Set as cover&quot; to change the main cover image.
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
                        <Button
                            type="button"
                            onClick={handleAddImage}
                            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-xl transition"
                        >
                            Add URL
                        </Button>
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
                                {index !== 0 && (
                                    <Button
                                        type="button"
                                        onClick={() => handleSetCoverImage(index)}
                                        className="absolute bottom-2 left-2 right-2 inline-flex items-center justify-center gap-1 rounded-lg bg-black/80 px-2 py-1 text-[10px] font-bold text-white opacity-100 transition-opacity hover:bg-black sm:opacity-0 sm:group-hover:opacity-100"
                                        title="Set as cover image"
                                    >
                                        <Star className="w-3 h-3" />
                                        Set as cover
                                    </Button>
                                )}
                                <Button
                                    type="button"
                                    onClick={() => handleRemoveImage(index)}
                                    className="absolute top-2 right-2 p-1.5 rounded-full bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-700"
                                    title="Delete photo"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </Button>
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

                    {/* Images by color */}
                    <div className="border-t border-gray-100 pt-6 space-y-4">
                        <div>
                            <h3 className="text-sm font-bold text-gray-900">
                                Main image by color
                            </h3>
                            <p className="mt-0.5 text-xs text-gray-500">
                                Pick one image for each color. The image stays in the
                                Product Images Gallery above; when a shopper selects that
                                color, it becomes the main image. Leave a color empty to
                                use the first gallery image.
                            </p>
                        </div>

                        <input
                            ref={colorFileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleColorFileInputChange}
                            className="hidden"
                        />

                        {formData.colors.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50/60 p-4 text-xs text-gray-500">
                                Select at least one color in the Product Variants section
                                to assign a main image.
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {formData.colors.map((color) => {
                                    const assignedUrl = formData.colorImages[color];

                                    return (
                                        <div
                                            key={color}
                                            className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4"
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="h-4 w-4 shrink-0 rounded-full border border-gray-300"
                                                        style={getColorStyle(color)}
                                                    />
                                                    <span className="text-sm font-bold text-gray-900">
                                                        {color}
                                                    </span>
                                                    <span className="rounded-lg bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                                                        {assignedUrl
                                                            ? "1 image selected"
                                                            : "No image selected"}
                                                    </span>
                                                </div>

                                                <Button
                                                    type="button"
                                                    onClick={() =>
                                                        handleTriggerColorFileInput(color)
                                                    }
                                                    disabled={
                                                        isUploadingImage ||
                                                        uploadingColor !== null
                                                    }
                                                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-black disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    {uploadingColor === color ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <UploadCloud className="h-3.5 w-3.5" />
                                                    )}
                                                    {uploadingColor === color
                                                        ? "Uploading..."
                                                        : "Upload"}
                                                </Button>
                                            </div>

                                            {assignedUrl ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                                                        <img
                                                            src={assignedUrl}
                                                            alt={`${color} main preview`}
                                                            className="h-full w-full object-cover"
                                                        />
                                                        <span className="absolute left-1.5 top-1.5 rounded-md bg-black px-1.5 py-0.5 text-[9px] font-bold text-white">
                                                            Main
                                                        </span>
                                                        <Button
                                                            type="button"
                                                            onClick={() =>
                                                                unassignImageFromColor(
                                                                    color,
                                                                )
                                                            }
                                                            className="absolute right-1.5 top-1.5 rounded-full bg-red-600 p-1 text-white opacity-0 shadow-sm transition-opacity hover:bg-red-700 group-hover:opacity-100"
                                                            title={`Remove main image for ${color}`}
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                    <p className="text-xs text-gray-500">
                                                        This photo is shown as the main image
                                                        when <strong>{color}</strong> is
                                                        selected.
                                                    </p>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-gray-500">
                                                    No main image set — the first gallery
                                                    image will be used for this color.
                                                </p>
                                            )}

                                            <div>
                                                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                                                    Choose from gallery
                                                </p>
                                                {formData.images.length > 0 ? (
                                                    <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
                                                        {formData.images.map((url, index) => {
                                                            const isSelected =
                                                                assignedUrl === url;

                                                            return (
                                                                <button
                                                                    type="button"
                                                                    key={`${url}-${index}`}
                                                                    onClick={() =>
                                                                        assignImageToColor(
                                                                            color,
                                                                            url,
                                                                        )
                                                                    }
                                                                    className={`group relative aspect-square overflow-hidden rounded-xl border bg-gray-50 transition ${
                                                                        isSelected
                                                                            ? "border-black ring-2 ring-black"
                                                                            : "border-gray-200 hover:border-black"
                                                                    }`}
                                                                    title={
                                                                        isSelected
                                                                            ? `Current main image for ${color}`
                                                                            : `Set as main image for ${color}`
                                                                    }
                                                                >
                                                                    <img
                                                                        src={url}
                                                                        alt={`Gallery option for ${color}`}
                                                                        className="h-full w-full object-cover"
                                                                    />
                                                                    {isSelected ? (
                                                                        <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                                                                            <Check className="h-5 w-5 text-white" />
                                                                        </span>
                                                                    ) : (
                                                                        <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                                                                            <Plus className="h-5 w-5 text-white" />
                                                                        </span>
                                                                    )}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-gray-500">
                                                        Add images to the gallery above first.
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex gap-2">
                                                <input
                                                    type="url"
                                                    value={colorUrlInputs[color] ?? ""}
                                                    onChange={(event) =>
                                                        handleColorUrlInputChange(
                                                            color,
                                                            event.target.value,
                                                        )
                                                    }
                                                    placeholder={`Paste an image URL for ${color}`}
                                                    className="form-input flex-1"
                                                />
                                                <Button
                                                    type="button"
                                                    onClick={() =>
                                                        handleAddColorImageUrl(color)
                                                    }
                                                    className="rounded-xl bg-gray-100 px-4 py-2.5 text-xs font-semibold text-gray-800 transition hover:bg-gray-200"
                                                >
                                                    Set URL
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Form Action Submit */}
                <div className="flex items-center justify-end gap-3 pt-4">
                    <Link to="/admin/products">
                        <Button
                            type="button"
                            className="px-5 py-3 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                        >
                            Cancel
                        </Button>
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
