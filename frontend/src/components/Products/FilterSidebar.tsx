import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Minus } from "lucide-react";
import { getColorStyle } from "../../utils/colors.ts";
import { catalogService } from "../../services/catalogService.ts";
import type { CatalogType } from "../../types/catalog.ts";
import { SORT_OPTIONS } from "./SortOptions.tsx";

interface FilterSidebarProps {
    onClose?: () => void;
    showSortSection?: boolean;
}

const FilterSidebar = ({ showSortSection = true }: FilterSidebarProps) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [filters, setFilters] = useState({
        category: "",
        gender: "",
        color: "",
        size: [] as string[],
        material: [] as string[],
        brand: [] as string[],
        minPrice: 0,
        maxPrice: 100,
    });

    const [priceRange, setPriceRange] = useState([0, 100]);
    const [catalog, setCatalog] = useState<Record<CatalogType, string[]>>({
        category: [],
        brand: [],
        material: [],
    });

    // Accordion state: all collapsed by default as in sample
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        sort: false,
        category: false,
        color: false,
        size: false,
        gender: false,
        material: false,
        brand: false,
        price: false,
    });

    const toggleSection = (key: string) => {
        setExpandedSections((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    const categories = Array.from(
        new Set([...catalog.category, filters.category].filter(Boolean))
    );
    const colors = [
        "Red",
        "Blue",
        "Black",
        "Green",
        "Yellow",
        "Gray",
        "White",
        "Pink",
        "Beige",
        "Navy",
        "Navy Blue",
        "Burgundy",
    ];
    const sizes = ["XS", "S", "M", "L", "XL", "XXL"];
    const materials = Array.from(
        new Set([...catalog.material, ...filters.material].filter(Boolean))
    );
    const brands = Array.from(
        new Set([...catalog.brand, ...filters.brand].filter(Boolean))
    );
    const genders = ["Men", "Women", "Unisex"];

    const currentSort = searchParams.get("sortBy") || "dateDesc";

    useEffect(() => {
        const params = Object.fromEntries([...searchParams]);

        const minPrice = Number(params.minPrice) || 0;
        const maxPrice = params.maxPrice ? Number(params.maxPrice) : 100;

        setFilters({
            category: params.category || "",
            gender: params.gender || "",
            color: params.color || "",
            size: params.size ? params.size.split(",") : [],
            material: params.material ? params.material.split(",") : [],
            brand: params.brand ? params.brand.split(",") : [],
            minPrice,
            maxPrice,
        });

        setPriceRange([minPrice, maxPrice]);
    }, [searchParams]);

    useEffect(() => {
        let isMounted = true;

        Promise.all([
            catalogService.getItems("category"),
            catalogService.getItems("brand"),
            catalogService.getItems("material"),
        ])
            .then(([categoriesData, brandsData, materialsData]) => {
                if (!isMounted) return;
                setCatalog({
                    category: categoriesData.map((item) => item.name),
                    brand: brandsData.map((item) => item.name),
                    material: materialsData.map((item) => item.name),
                });
            })
            .catch((error) => {
                console.warn("Could not load catalog filters:", error);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, []);

    const updateURLParams = (newFilters: typeof filters) => {
        const params = new URLSearchParams(searchParams);
        params.delete("page");

        Object.keys(newFilters).forEach((key) => {
            const val = newFilters[key as keyof typeof newFilters];
            if (Array.isArray(val)) {
                if (val.length > 0) {
                    params.set(key, val.join(","));
                } else {
                    params.delete(key);
                }
            } else if (key === "minPrice") {
                if (Number(val) > 0) {
                    params.set(key, val.toString());
                } else {
                    params.delete(key);
                }
            } else if (key === "maxPrice") {
                if (Number(val) < 100) {
                    params.set(key, val.toString());
                } else {
                    params.delete(key);
                }
            } else if (val) {
                params.set(key, val.toString());
            } else {
                params.delete(key);
            }
        });

        setSearchParams(params);
        navigate(`?${params.toString()}`, { replace: true });
    };

    const debouncedUpdateURLParams = (newFilters: typeof filters) => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        debounceTimeoutRef.current = setTimeout(() => {
            updateURLParams(newFilters);
        }, 500);
    };

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, checked, type } = e.target;
        let newFilters = { ...filters };

        if (type === "checkbox") {
            const currentArray = (newFilters[name as keyof typeof newFilters] as string[]) || [];
            if (checked) {
                newFilters = {
                    ...newFilters,
                    [name]: [...currentArray, value],
                };
            } else {
                newFilters = {
                    ...newFilters,
                    [name]: currentArray.filter((item) => item !== value),
                };
            }
        } else {
            newFilters = {
                ...newFilters,
                [name]: value,
            };
        }

        setFilters(newFilters);
        debouncedUpdateURLParams(newFilters);
    };

    const handleRadioClick = (name: "category" | "gender", value: string) => {
        if (filters[name] === value) {
            const newFilters = {
                ...filters,
                [name]: "",
            };
            setFilters(newFilters);
            debouncedUpdateURLParams(newFilters);
        }
    };

    const handleColorChange = (color: string) => {
        const newColor = filters.color === color ? "" : color;
        const newFilters = {
            ...filters,
            color: newColor,
        };
        setFilters(newFilters);
        debouncedUpdateURLParams(newFilters);
    };

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newPrice = Number(e.target.value);
        setPriceRange([0, newPrice]);
        const newFilters = {
            ...filters,
            minPrice: 0,
            maxPrice: newPrice,
        };
        setFilters(newFilters);
        debouncedUpdateURLParams(newFilters);
    };

    const handleSortChange = (value: string) => {
        const params = new URLSearchParams(searchParams);
        params.delete("page");
        if (value && value !== "dateDesc") {
            params.set("sortBy", value);
        } else {
            params.delete("sortBy");
        }
        setSearchParams(params, { replace: true });
    };

    const handleResetFilters = () => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        const defaultFilters = {
            category: "",
            gender: "",
            color: "",
            size: [],
            material: [],
            brand: [],
            minPrice: 0,
            maxPrice: 100,
        };
        setFilters(defaultFilters);
        setPriceRange([0, 100]);

        const params = new URLSearchParams(searchParams);
        ["category", "gender", "color", "size", "material", "brand", "minPrice", "maxPrice"].forEach((key) => {
            params.delete(key);
        });

        setSearchParams(params);
        navigate(params.toString() ? `?${params.toString()}` : "", { replace: true });
    };

    const hasActiveFilters =
        Boolean(filters.category) ||
        Boolean(filters.gender) ||
        Boolean(filters.color) ||
        filters.size.length > 0 ||
        filters.material.length > 0 ||
        filters.brand.length > 0 ||
        filters.minPrice > 0 ||
        filters.maxPrice < 100;

    return (
        <div className="pb-6">
            {/* Clear All bar when filters are applied */}
            {hasActiveFilters && (
                <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-gray-50/50">
                    <span className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">
                        Active Filters
                    </span>
                    <button
                        type="button"
                        onClick={handleResetFilters}
                        className="text-xs font-semibold text-neutral-900 hover:text-black underline underline-offset-2 cursor-pointer uppercase tracking-wider"
                    >
                        Clear All
                    </button>
                </div>
            )}

            {/* SORT BY Accordion Section (Mobile Only) */}
            {showSortSection && (
                <div className="border-b border-gray-200 md:hidden">
                    <button
                        type="button"
                        onClick={() => toggleSection("sort")}
                        className="w-full py-4.5 px-6 flex items-center justify-between text-left cursor-pointer transition-colors group select-none hover:bg-gray-50/50"
                        aria-expanded={expandedSections.sort}
                    >
                        <span className="flex items-center gap-2 text-xs font-medium tracking-widest text-neutral-900 group-hover:text-black uppercase">
                            Sort By
                            {searchParams.get("sortBy") && (
                                <span className="w-1.5 h-1.5 rounded-full bg-black inline-block" />
                            )}
                        </span>
                        <span className="text-gray-400 group-hover:text-black transition-colors">
                            {expandedSections.sort ? (
                                <Minus className="h-3.5 w-3.5 text-gray-600" />
                            ) : (
                                <Plus className="h-3.5 w-3.5 text-gray-600" />
                            )}
                        </span>
                    </button>

                    {expandedSections.sort && (
                        <div className="px-6 pb-6 pt-1 animate-in fade-in duration-200">
                            <div className="grid grid-cols-1 gap-1.5">
                                {SORT_OPTIONS.map((opt) => {
                                    const isSelected =
                                        currentSort === opt.value ||
                                        (!searchParams.get("sortBy") && opt.value === "dateDesc");
                                    return (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => handleSortChange(opt.value)}
                                            className={`w-full text-left px-3.5 py-2.5 text-xs font-medium tracking-wider uppercase transition-all cursor-pointer ${
                                                isSelected
                                                    ? "border-2 border-black bg-gray-50 font-bold text-black"
                                                    : "border border-transparent text-gray-700 hover:bg-gray-100"
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* CATEGORY Accordion Section */}
            <div className="border-b border-gray-200">
                <button
                    type="button"
                    onClick={() => toggleSection("category")}
                    className="w-full py-4.5 px-6 flex items-center justify-between text-left cursor-pointer transition-colors group select-none hover:bg-gray-50/50"
                    aria-expanded={expandedSections.category}
                >
                    <span className="flex items-center gap-2 text-xs font-medium tracking-widest text-neutral-900 group-hover:text-black uppercase">
                        Category
                        {filters.category && (
                            <span className="w-1.5 h-1.5 rounded-full bg-black inline-block" />
                        )}
                    </span>
                    <span className="text-gray-400 group-hover:text-black transition-colors">
                        {expandedSections.category ? (
                            <Minus className="h-3.5 w-3.5 text-gray-600" />
                        ) : (
                            <Plus className="h-3.5 w-3.5 text-gray-600" />
                        )}
                    </span>
                </button>

                {expandedSections.category && (
                    <div className="px-6 pb-6 pt-1 animate-in fade-in duration-200">
                        {categories.length === 0 && (
                            <p className="text-xs text-gray-400">
                                No categories available yet.
                            </p>
                        )}
                        {categories.map((category) => (
                            <label key={category} className="flex items-center mb-2.5 cursor-pointer group">
                                <input
                                    type="radio"
                                    name="category"
                                    value={category}
                                    onChange={handleFilterChange}
                                    onClick={() => handleRadioClick("category", category)}
                                    checked={filters.category === category}
                                    className="form-radio text-black focus:ring-black"
                                />
                                <span className="text-gray-700 text-sm ml-2.5 group-hover:text-black transition-colors">
                                    {category}
                                </span>
                            </label>
                        ))}
                    </div>
                )}
            </div>

            {/* COLOUR Accordion Section */}
            <div className="border-b border-gray-200">
                <button
                    type="button"
                    onClick={() => toggleSection("color")}
                    className="w-full py-4.5 px-6 flex items-center justify-between text-left cursor-pointer transition-colors group select-none hover:bg-gray-50/50"
                    aria-expanded={expandedSections.color}
                >
                    <span className="flex items-center gap-2 text-xs font-medium tracking-widest text-neutral-900 group-hover:text-black uppercase">
                        Colour
                        {filters.color && (
                            <span className="w-1.5 h-1.5 rounded-full bg-black inline-block" />
                        )}
                    </span>
                    <span className="text-gray-400 group-hover:text-black transition-colors">
                        {expandedSections.color ? (
                            <Minus className="h-3.5 w-3.5 text-gray-600" />
                        ) : (
                            <Plus className="h-3.5 w-3.5 text-gray-600" />
                        )}
                    </span>
                </button>

                {expandedSections.color && (
                    <div className="px-6 pb-6 pt-1 animate-in fade-in duration-200">
                        {filters.color && (
                            <div className="text-xs text-gray-500 mb-2.5 font-medium">
                                Selected: <span className="text-black font-semibold">{filters.color}</span>
                            </div>
                        )}
                        <div className="flex flex-wrap gap-2.5 pt-1">
                            {colors.map((color) => {
                                const isSelected = filters.color === color;
                                return (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => handleColorChange(color)}
                                        title={color}
                                        className={`w-7 h-7 rounded-full border border-gray-300 cursor-pointer transition-transform duration-200 hover:scale-110 ${
                                            isSelected ? "ring-2 ring-black ring-offset-2 scale-110 shadow-sm" : ""
                                        }`}
                                        style={getColorStyle(color)}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* CLOTHING SIZE Accordion Section */}
            <div className="border-b border-gray-200">
                <button
                    type="button"
                    onClick={() => toggleSection("size")}
                    className="w-full py-4.5 px-6 flex items-center justify-between text-left cursor-pointer transition-colors group select-none hover:bg-gray-50/50"
                    aria-expanded={expandedSections.size}
                >
                    <span className="flex items-center gap-2 text-xs font-medium tracking-widest text-neutral-900 group-hover:text-black uppercase">
                        Clothing Size
                        {filters.size.length > 0 && (
                            <span className="w-1.5 h-1.5 rounded-full bg-black inline-block" />
                        )}
                    </span>
                    <span className="text-gray-400 group-hover:text-black transition-colors">
                        {expandedSections.size ? (
                            <Minus className="h-3.5 w-3.5 text-gray-600" />
                        ) : (
                            <Plus className="h-3.5 w-3.5 text-gray-600" />
                        )}
                    </span>
                </button>

                {expandedSections.size && (
                    <div className="px-6 pb-6 pt-1 animate-in fade-in duration-200">
                        <div className="grid grid-cols-3 gap-2">
                            {sizes.map((size) => {
                                const isSelected = filters.size.includes(size);
                                return (
                                    <label
                                        key={size}
                                        className={`flex items-center justify-center py-2 px-2 border text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors text-center ${
                                            isSelected
                                                ? "bg-black text-white border-black"
                                                : "bg-white text-gray-800 border-gray-300 hover:border-black"
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            name="size"
                                            value={size}
                                            onChange={handleFilterChange}
                                            checked={isSelected}
                                            className="sr-only"
                                        />
                                        <span>{size}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* GENDER Accordion Section */}
            <div className="border-b border-gray-200">
                <button
                    type="button"
                    onClick={() => toggleSection("gender")}
                    className="w-full py-4.5 px-6 flex items-center justify-between text-left cursor-pointer transition-colors group select-none hover:bg-gray-50/50"
                    aria-expanded={expandedSections.gender}
                >
                    <span className="flex items-center gap-2 text-xs font-medium tracking-widest text-neutral-900 group-hover:text-black uppercase">
                        Gender
                        {filters.gender && (
                            <span className="w-1.5 h-1.5 rounded-full bg-black inline-block" />
                        )}
                    </span>
                    <span className="text-gray-400 group-hover:text-black transition-colors">
                        {expandedSections.gender ? (
                            <Minus className="h-3.5 w-3.5 text-gray-600" />
                        ) : (
                            <Plus className="h-3.5 w-3.5 text-gray-600" />
                        )}
                    </span>
                </button>

                {expandedSections.gender && (
                    <div className="px-6 pb-6 pt-1 animate-in fade-in duration-200">
                        {genders.map((gender) => (
                            <label key={gender} className="flex items-center mb-2.5 cursor-pointer group">
                                <input
                                    type="radio"
                                    name="gender"
                                    value={gender}
                                    onChange={handleFilterChange}
                                    onClick={() => handleRadioClick("gender", gender)}
                                    checked={filters.gender === gender}
                                    className="form-radio text-black focus:ring-black"
                                />
                                <span className="text-gray-700 text-sm ml-2.5 group-hover:text-black transition-colors">
                                    {gender}
                                </span>
                            </label>
                        ))}
                    </div>
                )}
            </div>

            {/* MATERIAL Accordion Section */}
            <div className="border-b border-gray-200">
                <button
                    type="button"
                    onClick={() => toggleSection("material")}
                    className="w-full py-4.5 px-6 flex items-center justify-between text-left cursor-pointer transition-colors group select-none hover:bg-gray-50/50"
                    aria-expanded={expandedSections.material}
                >
                    <span className="flex items-center gap-2 text-xs font-medium tracking-widest text-neutral-900 group-hover:text-black uppercase">
                        Material
                        {filters.material.length > 0 && (
                            <span className="w-1.5 h-1.5 rounded-full bg-black inline-block" />
                        )}
                    </span>
                    <span className="text-gray-400 group-hover:text-black transition-colors">
                        {expandedSections.material ? (
                            <Minus className="h-3.5 w-3.5 text-gray-600" />
                        ) : (
                            <Plus className="h-3.5 w-3.5 text-gray-600" />
                        )}
                    </span>
                </button>

                {expandedSections.material && (
                    <div className="px-6 pb-6 pt-1 animate-in fade-in duration-200">
                        {materials.length === 0 && (
                            <p className="text-xs text-gray-400">
                                No materials available yet.
                            </p>
                        )}
                        {materials.map((material) => (
                            <label key={material} className="flex items-center mb-2.5 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    name="material"
                                    value={material}
                                    onChange={handleFilterChange}
                                    checked={filters.material.includes(material)}
                                    className="form-checkbox text-black focus:ring-black rounded"
                                />
                                <span className="text-gray-700 text-sm ml-2.5 group-hover:text-black transition-colors">
                                    {material}
                                </span>
                            </label>
                        ))}
                    </div>
                )}
            </div>

            {/* BRAND Accordion Section */}
            <div className="border-b border-gray-200">
                <button
                    type="button"
                    onClick={() => toggleSection("brand")}
                    className="w-full py-4.5 px-6 flex items-center justify-between text-left cursor-pointer transition-colors group select-none hover:bg-gray-50/50"
                    aria-expanded={expandedSections.brand}
                >
                    <span className="flex items-center gap-2 text-xs font-medium tracking-widest text-neutral-900 group-hover:text-black uppercase">
                        Brand
                        {filters.brand.length > 0 && (
                            <span className="w-1.5 h-1.5 rounded-full bg-black inline-block" />
                        )}
                    </span>
                    <span className="text-gray-400 group-hover:text-black transition-colors">
                        {expandedSections.brand ? (
                            <Minus className="h-3.5 w-3.5 text-gray-600" />
                        ) : (
                            <Plus className="h-3.5 w-3.5 text-gray-600" />
                        )}
                    </span>
                </button>

                {expandedSections.brand && (
                    <div className="px-6 pb-6 pt-1 animate-in fade-in duration-200">
                        {brands.length === 0 && (
                            <p className="text-xs text-gray-400">
                                No brands available yet.
                            </p>
                        )}
                        {brands.map((brand) => (
                            <label key={brand} className="flex items-center mb-2.5 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    name="brand"
                                    value={brand}
                                    onChange={handleFilterChange}
                                    checked={filters.brand.includes(brand)}
                                    className="form-checkbox text-black focus:ring-black rounded"
                                />
                                <span className="text-gray-700 text-sm ml-2.5 group-hover:text-black transition-colors">
                                    {brand}
                                </span>
                            </label>
                        ))}
                    </div>
                )}
            </div>

            {/* PRICE Accordion Section */}
            <div className="border-b border-gray-200">
                <button
                    type="button"
                    onClick={() => toggleSection("price")}
                    className="w-full py-4.5 px-6 flex items-center justify-between text-left cursor-pointer transition-colors group select-none hover:bg-gray-50/50"
                    aria-expanded={expandedSections.price}
                >
                    <span className="flex items-center gap-2 text-xs font-medium tracking-widest text-neutral-900 group-hover:text-black uppercase">
                        Price
                        {(filters.minPrice > 0 || filters.maxPrice < 100) && (
                            <span className="w-1.5 h-1.5 rounded-full bg-black inline-block" />
                        )}
                    </span>
                    <span className="text-gray-400 group-hover:text-black transition-colors">
                        {expandedSections.price ? (
                            <Minus className="h-3.5 w-3.5 text-gray-600" />
                        ) : (
                            <Plus className="h-3.5 w-3.5 text-gray-600" />
                        )}
                    </span>
                </button>

                {expandedSections.price && (
                    <div className="px-6 pb-6 pt-2 animate-in fade-in duration-200">
                        <input
                            type="range"
                            name="priceRange"
                            min={0}
                            max={100}
                            value={priceRange[1]}
                            onChange={handlePriceChange}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                        />
                        <div className="flex justify-between text-gray-600 text-xs mt-2.5 font-medium">
                            <span>$0</span>
                            <span className="font-semibold text-black">${priceRange[1]}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FilterSidebar;
