import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const FilterSidebar = () => {
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

    const categories = ["Top Wear", "Bottom Wear"];
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
    ];
    const sizes = ["XS", "S", "M", "L", "XL", "XXL"];
    const materials = [
        "Cotton",
        "Wool",
        "Denim",
        "Polyester",
        "Silk",
        "Linen",
        "Viscose",
        "Fleece",
    ];
    const brands = [
        "Urban Threads",
        "Modern Fit",
        "Street Style",
        "Beach Breeze",
        "Fashionista",
        "ChicStyle",
    ];
    const genders = ["Men", "Women"];

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

    // Clean up timeout on unmount
    useEffect(() => {
        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, []);

    const updateURLParams = (newFilters: typeof filters) => {
        // Preserve other existing params like 'search', 'sortBy', etc.
        const params = new URLSearchParams(searchParams);

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

        // Keep non-filter params like 'search', 'sortBy'
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
        <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 border-b border-gray-200 pb-2">
                <h3 className="text-xl font-medium text-gray-800">Filter</h3>
                {hasActiveFilters && (
                    <button
                        type="button"
                        onClick={handleResetFilters}
                        className="text-xs text-rabbit-red hover:underline cursor-pointer font-medium"
                    >
                        Clear All
                    </button>
                )}
            </div>

            {/* Category Filter */}
            <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-2">Category</label>
                {categories.map((category) => (
                    <label key={category} className="flex items-center mb-1.5 cursor-pointer">
                        <input
                            type="radio"
                            name="category"
                            value={category}
                            onChange={handleFilterChange}
                            onClick={() => handleRadioClick("category", category)}
                            checked={filters.category === category}
                            className="mr-2 h-4 w-4 text-black focus:ring-black accent-black cursor-pointer"
                        />
                        <span className="text-gray-700 text-sm hover:text-black transition-colors">
                            {category}
                        </span>
                    </label>
                ))}
            </div>

            {/* Gender Filter */}
            <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-2">Gender</label>
                {genders.map((gender) => (
                    <label key={gender} className="flex items-center mb-1.5 cursor-pointer">
                        <input
                            type="radio"
                            name="gender"
                            value={gender}
                            onChange={handleFilterChange}
                            onClick={() => handleRadioClick("gender", gender)}
                            checked={filters.gender === gender}
                            className="mr-2 h-4 w-4 text-black focus:ring-black accent-black cursor-pointer"
                        />
                        <span className="text-gray-700 text-sm hover:text-black transition-colors">
                            {gender}
                        </span>
                    </label>
                ))}
            </div>

            {/* Color Filter */}
            <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-2">Color</label>
                <div className="flex flex-wrap gap-2 pt-1">
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
                                style={{ backgroundColor: color.toLowerCase() }}
                            />
                        );
                    })}
                </div>
            </div>

            {/* Size Filter */}
            <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-2">Size</label>
                {sizes.map((size) => (
                    <label key={size} className="flex items-center mb-1.5 cursor-pointer">
                        <input
                            type="checkbox"
                            name="size"
                            value={size}
                            onChange={handleFilterChange}
                            checked={filters.size.includes(size)}
                            className="mr-2 h-4 w-4 text-black focus:ring-black accent-black rounded cursor-pointer"
                        />
                        <span className="text-gray-700 text-sm hover:text-black transition-colors">
                            {size}
                        </span>
                    </label>
                ))}
            </div>

            {/* Material Filter */}
            <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-2">Material</label>
                {materials.map((material) => (
                    <label key={material} className="flex items-center mb-1.5 cursor-pointer">
                        <input
                            type="checkbox"
                            name="material"
                            value={material}
                            onChange={handleFilterChange}
                            checked={filters.material.includes(material)}
                            className="mr-2 h-4 w-4 text-black focus:ring-black accent-black rounded cursor-pointer"
                        />
                        <span className="text-gray-700 text-sm hover:text-black transition-colors">
                            {material}
                        </span>
                    </label>
                ))}
            </div>

            {/* Brand Filter */}
            <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-2">Brand</label>
                {brands.map((brand) => (
                    <label key={brand} className="flex items-center mb-1.5 cursor-pointer">
                        <input
                            type="checkbox"
                            name="brand"
                            value={brand}
                            onChange={handleFilterChange}
                            checked={filters.brand.includes(brand)}
                            className="mr-2 h-4 w-4 text-black focus:ring-black accent-black rounded cursor-pointer"
                        />
                        <span className="text-gray-700 text-sm hover:text-black transition-colors">
                            {brand}
                        </span>
                    </label>
                ))}
            </div>

            {/* Price Range Filter */}
            <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-2">Price Range</label>
                <input
                    type="range"
                    name="priceRange"
                    min={0}
                    max={100}
                    value={priceRange[1]}
                    onChange={handlePriceChange}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                />
                <div className="flex justify-between text-gray-600 text-xs mt-2">
                    <span>$0</span>
                    <span>${priceRange[1]}</span>
                </div>
            </div>
        </div>
    );
};

export default FilterSidebar;
