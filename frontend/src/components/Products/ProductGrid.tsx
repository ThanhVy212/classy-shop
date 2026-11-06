import { ImageOff } from "lucide-react";
import { Link } from "react-router-dom";
import WishlistButton from "./WishlistButton.tsx";

const ProductGrid = ({ products }: ProductGridProps) => {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {products.map((product, index) => {
        const id = product._id || product.productId || index;
        const imageUrl = product.images?.[0]?.url || product.image;
        const price = Number(
          product.discountPrice &&
            product.discountPrice > 0 &&
            product.discountPrice < product.price
            ? product.discountPrice
            : product.price
        );

        return (
          <div
            key={product._id || product.productId || index}
            className="group relative"
          >
            <Link to={`/products/${id}`} className="block">
              <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]">
                <div className="aspect-[3/4]">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[var(--color-ink-muted)]">
                      <ImageOff className="h-7 w-7" />
                      <span className="text-[11px] font-medium uppercase tracking-[0.18em]">
                        No image
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 text-sm">
                <h3 className="line-clamp-2 font-medium text-[var(--color-ink)] transition-colors group-hover:text-[var(--color-primary)]">
                  {product.name}
                </h3>
                <p className="mt-1 font-semibold text-[var(--color-ink-soft)]">
                  {Number.isFinite(price) ? `$${price.toFixed(2)}` : "—"}
                </p>
              </div>
            </Link>

            {product._id && (
              <div className="absolute right-2.5 top-2.5 z-10">
                <WishlistButton
                  size="sm"
                  product={{
                    _id: String(product._id),
                    name: product.name,
                    price: product.price,
                    discountPrice: product.discountPrice,
                    countInStock: product.countInStock,
                    category: product.category,
                    sizes: product.sizes,
                    colors: product.colors,
                    images: product.images,
                    image: product.image,
                    isPublished: product.isPublished,
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ProductGrid;
