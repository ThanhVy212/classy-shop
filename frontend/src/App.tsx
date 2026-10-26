import {BrowserRouter, Route, Routes} from 'react-router-dom';
import UserLayout from "./components/Layout/UserLayout.tsx";
import AdminLayout from "./components/Layout/AdminLayout.tsx";
import Home from "./pages/Home.tsx";
import { useEffect } from "react";
import {Toaster} from "sonner";
import { AuthProvider } from "./context/AuthContext.tsx";
import { CartProvider } from "./context/CartContext.tsx";
import Login from "./pages/Login.tsx";
import Register from "./pages/Register.tsx";
import Profile from "./pages/Profile.tsx";
import Collection from "./pages/Collection.tsx";
import ProductDetails from "./components/Products/ProductDetails.tsx";
import Checkout from "./components/Cart/Checkout.tsx";
import OrderDetails from "./pages/OrderDetails.tsx";
import AdminDashboard from "./components/Admin/AdminDashboard.tsx";
import ProductManagement from "./components/Admin/ProductManagement.tsx";
import EditProduct from "./components/Admin/EditProduct.tsx";
import OrderManagement from "./components/Admin/OrderManagement.tsx";
import UserManagement from "./components/Admin/UserManagement.tsx";

const App = () => {
    useEffect(() => {
        const scrollTimeouts = new Map<HTMLElement, number>();

        const handleScroll = (e: Event) => {
            const target = e.target;
            const element =
                target === document || target === window
                    ? document.body
                    : (target as HTMLElement);

            if (!element || !element.classList) return;

            if (element.classList.contains("better-scrollbar")) {
                element.classList.add("is-scrolling");

                const existingTimeout = scrollTimeouts.get(element);
                if (existingTimeout) {
                    window.clearTimeout(existingTimeout);
                }

                const timeout = window.setTimeout(() => {
                    element.classList.remove("is-scrolling");
                    scrollTimeouts.delete(element);
                }, 1000);

                scrollTimeouts.set(element, timeout);
            }
        };

        window.addEventListener("scroll", handleScroll, true);
        return () => {
            window.removeEventListener("scroll", handleScroll, true);
            scrollTimeouts.forEach((timeout) => window.clearTimeout(timeout));
            scrollTimeouts.clear();
        };
    }, []);

    return (
        <AuthProvider>
            <CartProvider>
                <BrowserRouter>
                    <Toaster position="top-right" />
                    <Routes>
                        <Route path="/" element={<UserLayout/>}>
                            <Route index element={<Home />} />
                            <Route path="/login" element={<Login />}/>
                            <Route path="/register" element={<Register />}/>
                            <Route path="/profile" element={<Profile />}/>
                            <Route path="/collections/:collection" element={<Collection />}/>
                            <Route path="/products/:id" element={<ProductDetails />}/>
                            <Route path="/checkout" element={<Checkout />}/>
                            <Route path="/order/:id" element={<OrderDetails />}/>
                        </Route>
                        <Route path="/admin" element={<AdminLayout />}>
                            <Route index element={<AdminDashboard />} />
                            <Route path="products" element={<ProductManagement />} />
                            <Route path="products/new" element={<EditProduct />} />
                            <Route path="products/:id/edit" element={<EditProduct />} />
                            <Route path="orders" element={<OrderManagement />} />
                            <Route path="users" element={<UserManagement />} />
                        </Route>
                    </Routes>
                </BrowserRouter>
            </CartProvider>
        </AuthProvider>
    );
};

export default App;
