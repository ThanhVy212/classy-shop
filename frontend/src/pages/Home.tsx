import { useEffect, useState } from "react";
import Hero from "../components/Layout/Hero.tsx";
import GenderCollectionSection from "../components/Products/GenderCollectionSection.tsx";
import NewArrivals from "../components/Products/NewArrivals.tsx";
import ProductDetails from "../components/Products/ProductDetails.tsx";
import ProductGrid from "../components/Products/ProductGrid.tsx";
import FeaturedCollection from "../components/Products/FeaturedCollection.tsx";
import FeaturesSection from "../components/Products/FeaturesSection.tsx";
import EmptyState from "../components/Common/EmptyState.tsx";
import { ProductGridSkeleton } from "../components/Common/Skeletons.tsx";
import { productService } from "../services/productService.ts";
import type { Product } from "../types/product.ts";

const Home = () => {
  const [womenTopWears, setWomenTopWears] = useState<Product[]>([]);
  const [loadingTopWears, setLoadingTopWears] = useState(true);
  const [topWearsError, setTopWearsError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    setLoadingTopWears(true);
    setTopWearsError(false);

    productService
      .getProducts({ gender: "Women", category: "Top Wear", limit: 4 })
      .then((data) => {
        if (isMounted) {
          setWomenTopWears(data?.products ?? []);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch top wears for women:", err);
        if (isMounted) {
          setWomenTopWears([]);
          setTopWearsError(true);
        }
      })
      .finally(() => {
        if (isMounted) setLoadingTopWears(false);
      });

    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  return (
    <div>
      <Hero />
      <GenderCollectionSection />
      <NewArrivals />

      {/* Best Seller */}
      <h2 className="text-3xl text-center font-bold mb-4">Best Seller</h2>
      <ProductDetails />

      <div className="container mx-auto px-4 lg:px-0 my-16">
        <h2 className="text-3xl text-center font-bold mb-8">
          Top Wears for Women
        </h2>
        {loadingTopWears ? (
          <ProductGridSkeleton count={4} />
        ) : womenTopWears.length > 0 ? (
          <ProductGrid products={womenTopWears} />
        ) : (
          <EmptyState
            title={topWearsError ? "Unable to load products" : "No products yet"}
            description={
              topWearsError
                ? "We couldn't reach the catalog. Please try again in a moment."
                : "Women's top wear is being prepared. Please check back soon."
            }
            action={
              topWearsError
                ? {
                    label: "Try again",
                    onClick: () => setReloadKey((current) => current + 1),
                  }
                : { label: "Browse all products", to: "/collections/all" }
            }
          />
        )}
      </div>

      <FeaturedCollection />
      <FeaturesSection />
    </div>
  );
};

export default Home;
