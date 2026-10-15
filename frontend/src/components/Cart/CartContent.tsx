import {sampleCartProducts} from "../../constants";
import { Trash } from 'lucide-react';
import Button from "../Common/Button.tsx";


const CartContent = () => {
    return (
        <div>
            {sampleCartProducts.map((product, index) => (
                <div key={index}
                    className="flex items-start justify-between py-4 border-b border-gray-300"
                >
                    <div className="flex items-center">
                        <img
                            src={product.image}
                            alt={product.name}
                            className="w-20 h-24 object-cover mr-4 rounded"
                        />

                        <div>
                            <h3>{product.name}</h3>
                            <p className="text-sm text-gray-500">
                                size: {product.size} | color: {product.color}
                            </p>

                            <div className="flex items-center mt-2">
                                <Button className="btn-qty">
                                    -
                                </Button>
                                <span className="mx-4">{product.quantity}</span>
                                <Button className="btn-qty">
                                    +
                                </Button>
                            </div>
                        </div>
                    </div>
                    <div>
                        <p>$ {product.price.toLocaleString()}</p>
                        <Button>
                            <Trash className="h-6 w-6 text-red-500" />
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    )
}
export default CartContent
