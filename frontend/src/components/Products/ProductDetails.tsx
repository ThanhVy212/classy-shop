import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import Button from "../Common/Button.tsx";
import ProductGrid from "./ProductGrid.tsx";
import { productService } from "../../services/productService.ts";
import { useCart } from "../../hooks/useCart.ts";
import type { Product } from "../../types/product.ts";
import { sampleSelectedProduct } from "../../constants";
import { getColorStyle } from "../../utils/colors.ts";

interface ProductDetailsProps {
  productId?: string;
}

const ProductDetails = ({ productId: propProductId }: ProductDetailsProps) => {
  const { id: paramId } = useParams<{ id: string }>();
  const targetId = propProductId || paramId;

  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [mainImage, setMainImage] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [isAddingToCart, setIsAddingToCart] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const fetchProduct = async () => {
      try {
        let loadedProduct: Product | null = null;
        if (targetId) {
          loadedProduct = await productService.getProductById(targetId);
        } else {
          // If no ID provided (e.g., Best Seller section on Homepage)
          loadedProduct = await productService.getBestSeller();
        }

        if (isMounted && loadedProduct) {
          setProduct(loadedProduct);
          const firstImg =
            loadedProduct.images?.[0]?.url ||
            loadedProduct.image ||
            "https://picsum.photos/500/500";
          setMainImage(firstImg);
          if (loadedProduct.sizes?.length) {
            setSelectedSize(loadedProduct.sizes[0]);
          }
          if (loadedProduct.colors?.length) {
            setSelectedColor(loadedProduct.colors[0]);
          }

          // Fetch similar products
          try {
            const similar = await productService.getSimilarProducts(
              loadedProduct._id,
            );
            if (isMounted) {
              setSimilarProducts(similar);
            }
          } catch {
            // Fail silently on similar products
          }
        }
      } catch (err) {
        console.warn(
          "Could not fetch product from API, using fallback data:",
          err,
        );
        if (isMounted) {
          const fallback = {
            ...sampleSelectedProduct,
            _id: targetId || "fallback-best-seller",
            countInStock: 20,
            sku: "FALLBACK-SKU",
            category: "Top Wear",
            collections: "Business Casual",
          } as unknown as Product;
          setProduct(fallback);
          setMainImage(fallback.images?.[0]?.url || "");
          if (fallback.sizes?.length) setSelectedSize(fallback.sizes[0]);
          if (fallback.colors?.length) setSelectedColor(fallback.colors[0]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchProduct();

    return () => {
      isMounted = false;
    };
  }, [targetId]);

  const handleQuantityChange = (action: "plus" | "minus") => {
    if (action === "plus") setQuantity((prev) => prev + 1);
    if (action === "minus" && quantity > 1) setQuantity((prev) => prev - 1);
  };

  const handleAddToCart = async () => {
    if (!product) return;

    if (!selectedSize || !selectedColor) {
      toast.error("Please select a size and color before adding to cart.", {
        duration: 2000,
      });
      return;
    }

    setIsAddingToCart(true);

    try {
      await addToCart(product._id, selectedSize, selectedColor, quantity);
      toast.success(`Added ${quantity} item(s) to cart!`, {
        duration: 2000,
      });
    } catch {
      toast.error("Failed to add product to cart. Please try again.");
    } finally {
      setIsAddingToCart(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="max-w-6xl mx-auto bg-white p-8 rounded-lg flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-6">
        <div className="max-w-6xl mx-auto bg-white p-8 rounded-lg text-center py-16">
          <h2 className="text-2xl font-bold mb-2">Product Not Found</h2>
          <p className="text-gray-500">
            The product you are looking for does not exist.
          </p>
        </div>
      </div>
    );
  }

  const images =
    product.images && product.images.length > 0
      ? product.images
      : product.image
        ? [{ url: product.image, altText: product.name }]
        : [{ url: "https://picsum.photos/500/500", altText: product.name }];

  const hasDiscount =
    product.discountPrice !== undefined &&
    product.discountPrice > 0 &&
    product.discountPrice < product.price;

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto bg-white p-8 rounded-lg">
        <div className="flex flex-col md:flex-row">
          {/* Left Thumb */}
          <div className="hidden md:flex flex-col space-y-4 mr-6">
            {images.map((image, index) => (
              <img
                key={image._id || index}
                src={image.url}
                alt={image?.altText || `Thumbnail ${index + 1}`}
                className={`w-20 h-20 object-cover rounded-lg cursor-pointer border transition-all duration-300 ease-in-out ${
                  mainImage === image.url
                    ? "scale-105 border-black ring-1 ring-black"
                    : "scale-100 border-gray-200 hover:border-gray-400"
                }`}
                onClick={() => setMainImage(image.url)}
              />
            ))}
          </div>

          {/* Main Image */}
          <div className="md:w-1/2">
            <div className="mb-4 overflow-hidden rounded-lg bg-gray-50">
              <img
                src={mainImage || images[0].url}
                alt={product.name}
                className="w-full h-auto max-h-[550px] object-cover rounded-lg"
              />
            </div>
          </div>

          {/* Mobile Thumb */}
          <div className="md:hidden flex overflow-x-auto space-x-4 mb-4 pb-2 better-scrollbar">
            {images.map((image, index) => (
              <img
                key={image._id || index}
                src={image.url}
                alt={image?.altText || `Thumbnail ${index + 1}`}
                className={`w-20 h-20 shrink-0 object-cover rounded-lg cursor-pointer border transition-all duration-300 ease-in-out ${
                  mainImage === image.url
                    ? "scale-105 border-black ring-1 ring-black"
                    : "scale-100 border-gray-200"
                }`}
                onClick={() => setMainImage(image.url)}
              />
            ))}
          </div>

          {/* Right Side */}
          <div className="md:w-1/2 md:ml-10">
            <h1 className="text-2xl md:text-3xl font-semibold mb-2">
              {product.name}
            </h1>

            <div className="flex items-center gap-3 mb-2">
              <p className="text-2xl font-bold text-gray-900">
                ${hasDiscount ? product.discountPrice : product.price}
              </p>
              {hasDiscount && (
                <p className="text-lg text-gray-400 line-through">
                  ${product.price}
                </p>
              )}
            </div>

            <p className="text-gray-600 mb-6 leading-relaxed">
              {product.description}
            </p>

            {/* Colors */}
            {product.colors && product.colors.length > 0 && (
              <div className="mb-4">
                <p className="text-gray-700 font-medium">
                  Color:{" "}
                  <span className="font-semibold text-black">
                    {selectedColor}
                  </span>
                </p>
                <div className="flex gap-2.5 mt-2">
                  {product.colors.map((color) => (
                    <Button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      aria-label={`Select color ${color}`}
                      className={`w-8 h-8 rounded-full border border-gray-300 transition-all duration-200 ease-in-out cursor-pointer ${
                        selectedColor === color
                          ? "ring-2 ring-black ring-offset-2 scale-105"
                          : "hover:scale-105"
                      }`}
                      style={getColorStyle(color)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Sizes */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="mt-4 mb-4">
                <p className="text-gray-700 font-medium">
                  Size:{" "}
                  <span className="font-semibold text-black">
                    {selectedSize}
                  </span>
                </p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {product.sizes.map((size) => (
                    <Button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`px-4 py-2 rounded-lg border font-medium text-sm transition-all duration-200 cursor-pointer ${
                        selectedSize === size
                          ? "bg-black text-white border-black shadow scale-110"
                          : "bg-white text-gray-800 border-gray-300 hover:border-black"
                      }`}>
                      {size}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="mb-6">
              <p className="text-gray-700 font-medium mb-2">Quantity:</p>
              <div className="flex items-center space-x-4">
                <Button
                  onClick={() => handleQuantityChange("minus")}
                  className="btn-qty"
                  aria-label="Decrease quantity">
                  -
                </Button>
                <span className="text-lg font-semibold w-8 text-center">
                  {quantity}
                </span>
                <Button
                  onClick={() => handleQuantityChange("plus")}
                  className="btn-qty"
                  aria-label="Increase quantity">
                  +
                </Button>
              </div>
            </div>

            <Button
              onClick={handleAddToCart}
              disabled={isAddingToCart}
              className={`btn-black py-3 px-6 rounded-lg w-full mb-4 font-semibold text-base transition-all ${
                isAddingToCart
                  ? "opacity-60 cursor-not-allowed"
                  : "cursor-pointer"
              }`}>
              {isAddingToCart ? "ADDING TO CART..." : "ADD TO CART"}
            </Button>

            {/* Characteristics */}
            {(product.brand || product.material || product.sku) && (
              <div className="mt-8 pt-6 border-t border-gray-200 text-gray-700">
                <h3 className="text-lg font-bold mb-3">Characteristics:</h3>
                <table className="w-full text-left text-sm text-gray-600">
                  <tbody>
                    {product.brand && (
                      <tr>
                        <td className="py-1.5 text-gray-500 w-32">Brand:</td>
                        <td className="py-1.5 font-semibold text-gray-800">
                          {product.brand}
                        </td>
                      </tr>
                    )}
                    {product.material && (
                      <tr>
                        <td className="py-1.5 text-gray-500 w-32">Material:</td>
                        <td className="py-1.5 font-semibold text-gray-800">
                          {product.material}
                        </td>
                      </tr>
                    )}
                    {product.sku && (
                      <tr>
                        <td className="py-1.5 text-gray-500 w-32">SKU:</td>
                        <td className="py-1.5 font-semibold text-gray-800">
                          {product.sku}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Similar Products */}
        {similarProducts.length > 0 && (
          <div className="mt-20">
            <h2 className="text-2xl text-center font-bold mb-6">
              You May Also Like
            </h2>
            <ProductGrid products={similarProducts} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetails;
