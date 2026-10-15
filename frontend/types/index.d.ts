type Product = {
    productId: number;
    name: string;
    size: string;
    color: string;
    quantity: number;
    price: number;
    image: string;
}

type Order = {
    _id: string;
    createdAt: string;
    shippingAddress: { city: string; country: string };
    orderItems: { name: string; image: string }[];
    totalPrice: number;
    isPaid: boolean;
}

interface CartDrawerProps {
    drawerOpen: boolean,
    toggleCartDrawer: () => void,
}

interface ProductGridProps {
    products: Product[];
}
