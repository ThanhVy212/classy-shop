import {useEffect, useRef, useState, type FormEvent} from "react";
import {Search, X} from "lucide-react";

const SearchBar = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
        }
    }, [isOpen]);

    const handleOpen = () => setIsOpen(true);

    const handleClose = () => {
        setIsOpen(false);
        setSearchTerm("");
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Escape") handleClose();
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const term = searchTerm.trim();
        if (!term) return;
        // TODO: navigate to search results page
        console.log("Searching for:", term);
    };

    if (!isOpen) {
        return (
            <button
                type="button"
                onClick={handleOpen}
                aria-label="Open search"
                className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 hover:text-black"
            >
                <Search className="h-5 w-5"/>
            </button>
        );
    }

    return (
        <form
            onSubmit={handleSubmit}
            onKeyDown={handleKeyDown}
            className="relative flex h-10 items-center rounded-full border border-gray-200 bg-gray-100 pl-4 pr-2 shadow-sm transition-all duration-300 focus-within:border-gray-400 focus-within:bg-white"
        >
            <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products..."
                aria-label="Search products"
                className="w-40 bg-transparent text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none sm:w-56 md:w-72"
            />

            {searchTerm && (
                <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    aria-label="Clear search"
                    className="mr-1 flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700"
                >
                    <X className="h-4 w-4"/>
                </button>
            )}

            <button
                type="submit"
                aria-label="Submit search"
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-200 hover:text-black"
            >
                <Search className="h-4 w-4"/>
            </button>

            <button
                type="button"
                onClick={handleClose}
                aria-label="Close search"
                className="ml-1 flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700"
            >
                <X className="h-4 w-4"/>
            </button>
        </form>
    );
};

export default SearchBar;
