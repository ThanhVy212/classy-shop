import { X } from "lucide-react";
import { createPortal } from "react-dom";
import CartContent from "../Cart/CartContent.tsx";
import Button from "../Common/Button.tsx";
import {useNavigate} from "react-router-dom";

const CartDrawer = ({ drawerOpen, toggleCartDrawer }: CartDrawerProps) => {
    const navigate = useNavigate();

    if (typeof document === "undefined") return null;

    const handleCheckout = () => {
        toggleCartDrawer();
        navigate("/checkout");
    }

    return createPortal(
        <>
            {/* Backdrop overlay */}
            {drawerOpen && (
                <div
                    onClick={toggleCartDrawer}
                    className="fixed inset-0 bg-black/50 z-[60] transition-opacity duration-300"
                />
            )}

            <div
                className={`fixed top-0 right-0 w-3/4 sm:w-1/2 md:w-[30rem] h-full bg-white shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col z-[70] ${
                    drawerOpen ? "translate-x-0" : "translate-x-full"
                }`}
            >
                <div className="flex justify-end p-4 border-b border-gray-100">
                    <Button onClick={toggleCartDrawer} className="cursor-pointer" aria-label="Close cart">
                        <X className="h-6 w-6 text-gray-600 hover:text-black transition-colors" />
                    </Button>
                </div>

                {/* Cart contents with scrollable area */}
                <div className="flex-1 p-4 overflow-y-auto better-scrollbar">
                    <h2 className="text-xl font-semibold mb-4">Your Cart</h2>
                    {/* Component for Cart Contents */}
                    <CartContent />
                </div>

                {/* Checkout button fixed at the bottom */}
                <div className="p-4 bg-white border-t border-gray-100 mt-auto shrink-0">
                    <Button
                        onClick={handleCheckout}
                        className="btn-black w-full py-3 rounded-lg font-semibold"
                    >
                        Checkout
                    </Button>

                    <p className="text-sm tracking-tighter text-gray-500 mt-2 text-center">
                        Shipping, taxes, and discount codes calculated at checkout.
                    </p>
                </div>
            </div>
        </>,
        document.body
    );
};

export default CartDrawer;
