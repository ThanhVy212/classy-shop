import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import Button from "../Common/Button.tsx";
import ProductGrid from "./ProductGrid.tsx";
import ProductImageZoom from "./ProductImageZoom.tsx";
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
            loadedProduct.images?.[0]?.url || loadedProduct.image || "";
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
              setSimilarProducts(similar || []);
            }
          } catch (err) {
            console.error("Failed to fetch similar products:", err);
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
      <div className="bg-[var(--color-canvas)] p-4 sm:p-6">
        <div className="mx-auto flex min-h-[400px] max-w-6xl items-center justify-center rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="bg-[var(--color-canvas)] p-4 sm:p-6">
        <div className="mx-auto max-w-6xl rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] px-8 py-16 text-center">
          <h2 className="mb-2 text-2xl font-semibold text-[var(--color-ink)]">
            Product not found
          </h2>
          <p className="text-sm text-[var(--color-ink-soft)]">
            The piece you are looking for is no longer available.
          </p>
          <Link
            to="/collections/all"
            className="checkout-primary-button mx-auto mt-6 max-w-xs"
          >
            Browse the collection
          </Link>
        </div>
      </div>
    );
  }

  const images =
    product.images && product.images.length > 0
      ? product.images
      : product.image
        ? [{ url: product.image, altText: product.name }]
        : [];

  const hasDiscount =
    product.discountPrice !== undefined &&
    product.discountPrice > 0 &&
    product.discountPrice < product.price;

  return (
    <div className="bg-[var(--color-canvas)] px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xs sm:p-8 lg:p-10">
        <div className="flex flex-col md:flex-row">
          {/* Left Thumb */}
          <div className="hidden md:flex flex-col space-y-4 mr-6">
            {images.map((image, index) => (
              <img
                key={image._id || index}
                src={image.url}
                alt={image?.altText || `Thumbnail ${index + 1}`}
                className={`w-20 h-20 object-cover rounded-xl cursor-pointer border-2 transition-all duration-300 ease-in-out ${
                  mainImage === image.url
                    ? "scale-110 ring-offset-[var(--color-surface)]"
                    : "scale-100 border-[var(--color-border)] hover:border-[var(--color-primary)]"
                }`}
                onClick={() => setMainImage(image.url)}
              />
            ))}
          </div>

          {/* Main Image with Zoom */}
          <div className="md:w-1/2">
            <ProductImageZoom
              src={mainImage || images[0].url}
              alt={product.name}
              images={images}
              currentIndex={Math.max(
                0,
                images.findIndex((img) => img.url === (mainImage || images[0].url))
              )}
              onSelectImage={(idx) => {
                if (images[idx]) {
                  setMainImage(images[idx].url);
                }
              }}
            />
          </div>

          {/* Mobile Thumb */}
          <div className="md:hidden flex overflow-x-auto space-x-4 mb-4 pb-2 better-scrollbar">
            {images.map((image, index) => (
              <img
                key={image._id || index}
                src={image.url}
                alt={image?.altText || `Thumbnail ${index + 1}`}
                className={`w-20 h-20 shrink-0 object-cover rounded-xl cursor-pointer border-2 transition-all duration-300 ease-in-out ${
                  mainImage === image.url
                    ? "scale-105 border-[var(--color-primary)] ring-2 ring-[var(--color-primary)] ring-offset-2 ring-offset-[var(--color-surface)]"
                    : "scale-100 border-[var(--color-border)]"
                }`}
                onClick={() => setMainImage(image.url)}
              />
            ))}
          </div>

          {/* Right Side */}
          <div className="md:w-1/2 md:ml-10">
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)] md:text-3xl">
              {product.name}
            </h1>

            <div className="flex items-center gap-3 mb-2 mt-2">
              <p className="text-2xl font-semibold text-[var(--color-ink)]">
                ${hasDiscount ? product.discountPrice : product.price}
              </p>
              {hasDiscount && (
                <p className="text-lg text-[var(--color-ink-muted)] line-through">
                  ${product.price}
                </p>
              )}
            </div>

            <p className="mb-6 leading-relaxed text-[var(--color-ink-soft)]">
              {product.description}
            </p>

            {/* Colors */}
            {product.colors && product.colors.length > 0 && (
              <div className="mb-4">
                <p className="font-medium text-[var(--color-ink-soft)]">
                  Color:{" "}
                  <span className="font-semibold text-[var(--color-ink)]">
                    {selectedColor}
                  </span>
                </p>
                <div className="flex gap-2.5 mt-2">
                  {product.colors.map((color) => (
                    <Button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      aria-label={`Select color ${color}`}
                      className={`w-8 h-8 rounded-full border border-[var(--color-border-strong)] transition-all duration-200 ease-in-out cursor-pointer ${
                        selectedColor === color
                          ? "ring-2 ring-[var(--color-primary)] ring-offset-2 ring-offset-[var(--color-surface)] scale-105"
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
                <p className="font-medium text-[var(--color-ink-soft)]">
                  Size:{" "}
                  <span className="font-semibold text-[var(--color-ink)]">
                    {selectedSize}
                  </span>
                </p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {product.sizes.map((size) => (
                    <Button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`min-w-[3rem] px-4 py-2 rounded-xl border font-medium text-sm transition-all duration-200 cursor-pointer ${
                        selectedSize === size
                          ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm scale-105"
                          : "bg-transparent text-[var(--color-ink)] border-[var(--color-border-strong)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]"
                      }`}>
                      {size}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="mb-6">
              <p className="font-medium text-[var(--color-ink-soft)] mb-2">Quantity:</p>
              <div className="flex items-center space-x-4">
                <Button
                  onClick={() => handleQuantityChange("minus")}
                  className="btn-qty"
                  aria-label="Decrease quantity">
                  -
                </Button>
                <span className="text-lg font-semibold w-8 text-center text-[var(--color-ink)]">
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
              className={`btn-black py-3.5 px-6 rounded-2xl w-full mb-4 font-semibold text-sm tracking-wide uppercase transition-all ${
                isAddingToCart
                  ? "opacity-60 cursor-not-allowed"
                  : "cursor-pointer"
              }`}>
              {isAddingToCart ? "Adding to cart..." : "Add to cart"}
            </Button>

            {/* Characteristics */}
            {(product.brand || product.material) && (
              <div className="mt-8 pt-6 border-t border-[var(--color-border)] text-[var(--color-ink-soft)]">
                <h3 className="mb-3 text-lg font-semibold text-[var(--color-ink)]">Characteristics</h3>
                <table className="w-full text-left text-sm">
                  <tbody>
                    {product.brand && (
                      <tr>
                        <td className="py-1.5 text-[var(--color-ink-soft)] w-32">Brand:</td>
                        <td className="py-1.5 font-semibold text-[var(--color-ink)]">
                          {product.brand}
                        </td>
                      </tr>
                    )}
                    {product.material && (
                      <tr>
                        <td className="py-1.5 text-[var(--color-ink-soft)] w-32">Material:</td>
                        <td className="py-1.5 font-semibold text-[var(--color-ink)]">
                          {product.material}
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
          <div className="mt-20 border-t border-[var(--color-border)] pt-10">
            <h2 className="mb-8 text-center text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
              You may also like
            </h2>
            <ProductGrid products={similarProducts} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetails;
