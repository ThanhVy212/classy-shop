import {BrowserRouter, Route, Routes} from 'react-router-dom';
import UserLayout from "./components/Layout/UserLayout.tsx";
import AdminLayout from "./components/Layout/AdminLayout.tsx";
import Home from "./pages/Home.tsx";
import { useEffect } from "react";
import {Toaster} from "sonner";
import Login from "./pages/Login.tsx";
import Register from "./pages/Register.tsx";
import Profile from "./pages/Profile.tsx";
import Collection from "./pages/Collection.tsx";
import ProductDetails from "./components/Products/ProductDetails.tsx";

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
                </Route>
                <Route path="/admin" element={<AdminLayout />}>
                    {/*Admin Layout*/}
                </Route>
            </Routes>
        </BrowserRouter>
    );
};

export default App;
