import { useEffect, useRef, useState, type FormEvent } from "react";
import { Search, X } from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import Button from "./Button.tsx";
import { useDebounce } from "../../hooks/useDebounce.ts";

const SearchBar = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [searchTerm, setSearchTerm] = useState(() => searchParams.get("search") || "");
    const [isOpen, setIsOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const isFirstRender = useRef(true);

    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    // Sync input when searchParam changes externally
    useEffect(() => {
        const querySearch = searchParams.get("search") || "";
        if (querySearch !== searchTerm && !isOpen) {
            setSearchTerm(querySearch);
        }
    }, [searchParams]);

    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
        }
    }, [isOpen]);

    // Debounced search effect
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const trimmed = debouncedSearchTerm.trim();
        const currentParam = searchParams.get("search") || "";

        // If no change, do nothing
        if (trimmed === currentParam) return;

        if (trimmed) {
            if (location.pathname.startsWith("/collections/")) {
                const params = new URLSearchParams(searchParams);
                params.set("search", trimmed);
                setSearchParams(params, { replace: true });
            } else {
                navigate(`/collections/all?search=${encodeURIComponent(trimmed)}`);
            }
        } else if (currentParam && location.pathname.startsWith("/collections/")) {
            const params = new URLSearchParams(searchParams);
            params.delete("search");
            setSearchParams(params, { replace: true });
        }
    }, [debouncedSearchTerm]);

    const handleOpen = () => {
        setIsOpen(true);
    };

    const handleClose = () => {
        setIsOpen(false);
        setSearchTerm("");
        if (searchParams.has("search") && location.pathname.startsWith("/collections/")) {
            const params = new URLSearchParams(searchParams);
            params.delete("search");
            setSearchParams(params, { replace: true });
        }
    };

    const handleClear = () => {
        setSearchTerm("");
        if (searchParams.has("search") && location.pathname.startsWith("/collections/")) {
            const params = new URLSearchParams(searchParams);
            params.delete("search");
            setSearchParams(params, { replace: true });
        }
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Escape") handleClose();
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const term = searchTerm.trim();
        if (location.pathname.startsWith("/collections/")) {
            const params = new URLSearchParams(searchParams);
            if (term) {
                params.set("search", term);
            } else {
                params.delete("search");
            }
            setSearchParams(params, { replace: true });
        } else if (term) {
            navigate(`/collections/all?search=${encodeURIComponent(term)}`);
        }
    };

    if (!isOpen) {
        return (
            <Button
                type="button"
                onClick={handleOpen}
                aria-label="Open search"
                className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 hover:text-black cursor-pointer"
            >
                <Search className="h-5 w-5" />
            </Button>
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
                <Button
                    type="button"
                    onClick={handleClear}
                    aria-label="Clear search"
                    className="mr-1 flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700 cursor-pointer"
                >
                    <X className="h-4 w-4" />
                </Button>
            )}

            <Button
                type="submit"
                aria-label="Submit search"
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-200 hover:text-black cursor-pointer"
            >
                <Search className="h-4 w-4" />
            </Button>

            <Button
                type="button"
                onClick={handleClose}
                aria-label="Close search"
                className="ml-1 flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700 cursor-pointer"
            >
                <X className="h-4 w-4" />
            </Button>
        </form>
    );
};

export default SearchBar;
