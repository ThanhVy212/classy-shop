type Product = {
    productId: number;
    name: string;
    size: string;
    color: string;
    quantity: number;
    price: number;
    image: string;
}

interface CartDrawerProps {
    drawerOpen: boolean,
    toggleCartDrawer: () => void,
}

interface ProductGridProps {
    products: Product[];
}
