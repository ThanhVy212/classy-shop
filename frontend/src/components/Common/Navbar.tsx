import {Link} from "react-router-dom";
import {mainNavigationLinks} from "../../constants";
import {UserRound, X} from 'lucide-react';
import { ShoppingCart } from 'lucide-react';
import { Menu } from 'lucide-react';
import SearchBar from "./SearchBar.tsx";
import CartDrawer from "../Layout/CartDrawer.tsx";
import {useState} from "react";
import Button from "./Button.tsx";
import logo from "../../assets/logo.svg";



const Navbar = () => {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [navDrawerOpen, setNavDrawerOpen] = useState(false);

    const toggleNavDrawer = () => {
        setNavDrawerOpen(!navDrawerOpen);
    }

    const toggleDrawer = () => {
        setDrawerOpen(!drawerOpen);
    };

    return (
        <>
            <nav className="container mx-auto flex items-center justify-between px-4 py-4">
                {/* Left - Logo */}
                <div>
                    <Link to="/">
                        <div className="flex items-center">
                            <img src={logo} alt="logo" className="w-24 h-24" />
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
                            key={items.label}
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

                    <Button onClick={toggleDrawer} className="relative">
                        <ShoppingCart className="h-6 w-6 text-gray-600 hover:text-black" />
                        <span className="badge-red absolute -top-1 -right-2">
                            4
                        </span>
                    </Button>

                    <SearchBar />

                    <Button onClick={toggleNavDrawer} className="md:hidden">
                        <Menu className="h-6 w-6 text-gray-600 hover:text-black"/>
                    </Button>

                </div>
            </nav>
            <CartDrawer drawerOpen={drawerOpen} toggleCartDrawer={toggleDrawer} />

            {/*Mobile Navigation*/}
            <div
                className={`fixed top-0 left-0 z-50 flex h-full w-3/4 flex-col bg-white shadow-lg transform transition-transform duration-300 ease-in-out sm:w-1/2 md:w-1/3
                ${navDrawerOpen ? "translate-x-0" : "-translate-x-full"}`}
            >
                    <div className='flex justify-end p-4'>
                        <Button onClick={toggleNavDrawer}>
                            <X className="h-6 w-6 text-gray-600" />
                        </Button>
                    </div>

                    <div className="p-4">
                        <h2 className="text-xl font-semibold mb-4">Menu</h2>
                        <nav className="space-y-4">
                            {mainNavigationLinks.map((items) => (
                                <Link
                                    key={items.label}
                                    to={items.href}
                                    className="text-gray-700 hover:text-black text-sm font-medium uppercase block"
                                >
                                    {items.label}
                                </Link>
                            ))}
                        </nav>
                </div>
            </div>

        </>
    )
}
export default Navbar
