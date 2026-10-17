type Product = {
    productId: number;
    name: string;
    size: string;
    color: string;
    quantity: number;
    price: number;
    image: string;
}

type OrderItem = {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    image: string;
};

type ShippingAddress = {
    city: string;
    country: string;
    address?: string;
    postalCode?: string;
};

type OrderDetails = {
    _id: string | undefined;
    createdAt: Date | string;
    isPaid: boolean;
    isDelivered: boolean;
    paymentMethod: string;
    shippingMethod: string;
    shippingAddress: ShippingAddress;
    orderItems: OrderItem[];
    totalPrice?: number;
};

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

type AdminUser = {
    _id: string;
    name: string;
    email: string;
    role: "admin" | "customer";
    avatar?: string;
    createdAt: string;
};

type AdminOrder = {
    _id: string;
    customer: {
        name: string;
        email: string;
    };
    totalPrice: number;
    isPaid: boolean;
    status: "Processing" | "Shipped" | "Delivered" | "Cancelled";
    createdAt: string;
    itemsCount: number;
};
