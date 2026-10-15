import {Link} from "react-router-dom";

const ProductGrid = ({products} : ProductGridProps) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product, index) => (
                <Link
                    key={index}
                    to={`/products/${index}`}
                    className="block"
                >
                    <div className="bg-white p-4 rounded-lg">
                        <div className="w-full h-96 mb-4">
                            <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-cover rounded-lg"
                            />
                        </div>

                        <div className="text-sm">
                            <h3 className="mb-2">{product.name}</h3>
                            <p className="font-semibold text-gray-500 tracking-tighter">$ {product.price}</p>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    )
}
export default ProductGrid
