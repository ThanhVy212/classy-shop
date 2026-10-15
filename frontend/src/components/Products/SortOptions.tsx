import { useSearchParams } from "react-router-dom";

const SortOptions = () => {
    const [searchParams, setSearchParams] = useSearchParams();

    const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const sortBy = e.target.value;
        const newParams = new URLSearchParams(searchParams);

        if (sortBy) {
            newParams.set("sortBy", sortBy);
        } else {
            newParams.delete("sortBy");
        }

        setSearchParams(newParams, { replace: true });
    };

    return (
        <div className="flex items-center">
            <select
                id="sort"
                value={searchParams.get("sortBy") || ""}
                onChange={handleSortChange}
                className="border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-1 focus:ring-black text-sm text-gray-700 bg-white cursor-pointer"
            >
                <option value="">Default</option>
                <option value="priceAsc">Price: Low to High</option>
                <option value="priceDesc">Price: High to Low</option>
                <option value="popularity">Popularity</option>
            </select>
        </div>
    );
};

export default SortOptions;
