import {sampleCartProducts, sampleSelectedProduct} from "../../constants";
import Button from "../Common/Button.tsx";
import {useEffect, useState} from "react";
import {toast} from "sonner";
import ProductGrid from "./ProductGrid.tsx";

const ProductDetails = () => {
    const [mainImage, setMainImage] = useState(() => sampleSelectedProduct?.images?.[0]?.url ?? "");
    const [selectedSize, setSelectedSize] = useState("");
    const [selectedColor, setSelectedColor] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [isButtonDisabled, setIsButtonDisabled] = useState(false);

    useEffect(() => {
        if(sampleSelectedProduct?.images?.length > 0) {
            setMainImage(sampleSelectedProduct.images[0].url)
        }
    }, [sampleSelectedProduct]);

    const handleQuantityChange = (action: string) => {
        if(action === "plus") setQuantity((prev) => prev + 1);
        if(action === "minus" && quantity > 1) setQuantity((prev) => prev - 1);
    }

    const handleAddToCart = () => {
        if(!selectedSize || !selectedColor) {
            toast.error("Please select a size and color before adding to cart.", {
                duration: 1000,
            });
            return;
        }

        setIsButtonDisabled(true);

        setTimeout(() => {
            toast.success("Product added to cart", {
                duration: 1000,
            });
            setIsButtonDisabled(false);
        }, 500);
    }

    return (
        <div className="p-6">
            <div className="max-w-6xl mx-auto bg-white p-8 rounded-lg">
                <div className="flex flex-col md:flex-row">
                    {/* Left Thumb */}
                    <div className="hidden md:flex flex-col space-y-4 mr-6">
                        {sampleSelectedProduct.images.map((image, index) => (
                            <img
                                key={index}
                                src={image.url}
                                alt={image?.altText || `Thumbnail ${index}`}
                                className={`w-20 h-20 object-cover rounded-lg cursor-pointer border transition-all duration-300 ease-in-out 
                                    ${mainImage === image.url ? "scale-115 border-black" : "scale-100 border-gray-200"}`}
                                onClick={() => setMainImage(image.url)}
                            />
                        ))}
                    </div>

                    {/* Main Image */}
                    <div className="md:w-1/2">
                        <div className="mb-4">
                            <img
                                src={mainImage}
                                alt="Main Product"
                                className="w-full h-auto object-cover rounded-lg"
                            />
                        </div>
                    </div>

                    {/* Mobile Thumb */}
                    <div className="md:hidden flex overscroll-x-scroll space-x-4 mb-4">
                        {sampleSelectedProduct.images.map((image, index) => (
                            <img
                                key={index}
                                src={image.url}
                                alt={image?.altText || `Thumbnail ${index}`}
                                className={`w-20 h-20 object-cover rounded-lg cursor-pointer border transition-all duration-300 ease-in-out 
                                    ${mainImage === image.url ? "scale-115 border-black" : "scale-100 border-gray-200"}`}
                                onClick={() => setMainImage(image.url)}
                            />
                        ))}
                    </div>

                    {/* Right Side */}
                    <div className="md:w-1/2 md:ml-10">
                        <h1 className="text-2xl md:text-3xl font-semibold mb-2">
                            {sampleSelectedProduct.name}
                        </h1>
                        <p className="text-lg text-gray-600 mb-1 line-through">
                            {sampleSelectedProduct.originalPrice && `$ ${sampleSelectedProduct.originalPrice}`}
                        </p>
                        <p className="text-xl text-gray-500 mb-2">
                            $ {sampleSelectedProduct.price}
                        </p>
                        <p className="text-gray-600 mb-4">{sampleSelectedProduct.description}</p>

                        <div className="mb-4">
                            <p className="text-gray-700">Color:</p>
                            <div className="flex gap-2 mt-2">
                                {sampleSelectedProduct.colors.map((color) => (
                                    <Button
                                        key={color}
                                        onClick={() => setSelectedColor(color)}
                                        className={`w-8 h-8 rounded-full border transition-all duration-300 ease-in-out
                                            ${selectedColor === color ? "scale-120 border-black" : "scale-100 border-gray-200"}`}
                                        style={{
                                            backgroundColor: color.toLowerCase(),
                                            filter: "brightness(0.5)",
                                        }}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="mt-4">
                            <p className="text-gray-700">Size:</p>
                            <div className="flex gap-2 mt-2">
                                {sampleSelectedProduct.sizes.map((size) => (
                                    <Button
                                        key={size}
                                        onClick={() => setSelectedSize(size)}
                                        className={`px-4 py-2 rounded border transition-all duration-300 ease-in-out 
                                            ${selectedSize === size ? "scale-120 bg-black text-white" : "scale-100 bg-white text-black"}`}
                                    >
                                        {size}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="mb-6">
                            <p className="text-gray-700">Quantity:</p>
                            <div className="flex items-center space-x-4 mt-2">
                                <Button
                                    onClick={() => handleQuantityChange("minus")}
                                    className="btn-qty"
                                >
                                    -
                                </Button>
                                <span className="text-lg">{quantity}</span>
                                <Button
                                    onClick={() => handleQuantityChange("plus")}
                                    className="btn-qty"
                                >
                                    +
                                </Button>
                            </div>
                        </div>

                        <Button
                            onClick={handleAddToCart}
                            disabled={isButtonDisabled}
                            className={`btn-black py-2 px-6 rounded w-full mb-4 ${
                                isButtonDisabled ? "opacity-50 pointer-events-none" : ""
                            }`}
                        >
                            {isButtonDisabled ? "ADDING..." : "ADD TO CART"}
                        </Button>

                        <div className="mt-10 text-gray-700">
                            <h3 className="text-xl font-bold mb-4">Characteristics:</h3>
                            <table className="w-full text-left text-sm text-gray-600">
                                <tbody>
                                    <tr>
                                        <td className="py-1">Brand:</td>
                                        <td className="py-1 font-semibold">{sampleSelectedProduct.brand}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1">Material:</td>
                                        <td className="py-1 font-semibold">{sampleSelectedProduct.material}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="mt-20">
                    <h2 className="text-2xl text-center font-medium mb-4">
                        You May Also Like
                    </h2>
                    <ProductGrid products={sampleCartProducts}/>
                </div>
            </div>
        </div>
    )
}
export default ProductDetails
