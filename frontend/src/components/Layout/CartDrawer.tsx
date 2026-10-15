import { X } from 'lucide-react';
import CartContent from "../Cart/CartContent.tsx";
import Button from "../Common/Button.tsx";

const CartDrawer = ({drawerOpen, toggleCartDrawer}:CartDrawerProps) => {
    return (
        <div
            className={`fixed top-0 right-0 w-3/4 sm:w-1/2 md:w-[30rem] h-full bg-white shadow-lg transform transition-transform duration-300 flex flex-col z-50
                        ${drawerOpen ? "translate-x-0" : "translate-x-full"}`}
        >
            <div className='flex justify-end p-4'>
                <Button onClick={toggleCartDrawer}>
                    <X className="h-6 w-6 text-gray-600" />
                </Button>
            </div>

            {/*Cart contents with scrollable area*/}
            <div className="flex-row p-4 overflow-y-auto better-scrollbar">
                <h2 className="text-xl font-semibold mb-4">Your Cart</h2>
                {/*Component for Cart Contents*/}
                <CartContent />
            </div>

            {/*Checkout button fixed at the bottom*/}
            <div className="p-4 bg-white mt-auto shrink-0">
                <Button className="btn-black w-full py-3 rounded-lg font-semibold">
                    Checkout
                </Button>

                <p className="text-sm tracking-tighter text-gray-500 mt-2 text-center">
                    Shipping, taxes, and discount codes calculated at checkout.
                </p>
            </div>
        </div>
    )
}
export default CartDrawer
