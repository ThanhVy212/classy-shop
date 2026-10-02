import {Link} from "react-router-dom";
import {mainNavigationLinks} from "../../constants";
import { UserRound } from 'lucide-react';
import { ShoppingCart } from 'lucide-react';
import { Menu } from 'lucide-react';
import SearchBar from "./SearchBar.tsx";


const Navbar = () => {
    return (
        <>
            <nav className="container mx-auto flex items-center justify-between px-4 py-4">
                {/* Left - Logo */}
                <div>
                    <Link to="/">
                        <div className="flex items-center">
                            <img src="/assets/logo.svg" alt="logo" className="w-24 h-24" />
                            <div className="text-2xl font-medium hidden sm:block">
                                ClassyShop
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Center - Navigation Links */}
                <div className="hidden md:flex space-x-6">
                    {mainNavigationLinks.map((items) => (
                        <Link
                            key={items.href}
                            to={items.href}
                            className="text-gray-700 hover:text-black text-sm font-medium uppercase"
                        >
                            {items.label}
                        </Link>
                    ))}
                </div>

                {/* Right - Icons */}
                <div className="flex items-center space-x-4">
                    <Link to="/profile">
                        <UserRound className="h-6 w-6 text-gray-600 hover:text-black" />
                    </Link>

                    <button className="relative hover:cursor-pointer">
                        <ShoppingCart className="h-6 w-6 text-gray-600 hover:text-black" />
                        <span className="absolute -top-1 -right-2 bg-rabbit-red text-white text-xs rounded-full px-2 py-0.5">
                            4
                        </span>
                    </button>

                    <SearchBar />

                    <button className="hover:cursor-pointer md:hidden">
                        <Menu className="h-6 w-6 text-gray-600 hover:text-black"/>
                    </button>

                </div>
            </nav>
        </>
    )
}
export default Navbar
