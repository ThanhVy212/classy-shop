import { useEffect, useState } from "react";
import Hero from "../components/Layout/Hero.tsx";
import GenderCollectionSection from "../components/Products/GenderCollectionSection.tsx";
import NewArrivals from "../components/Products/NewArrivals.tsx";
import ProductDetails from "../components/Products/ProductDetails.tsx";
import ProductGrid from "../components/Products/ProductGrid.tsx";
import FeaturedCollection from "../components/Products/FeaturedCollection.tsx";
import FeaturesSection from "../components/Products/FeaturesSection.tsx";
import { productService } from "../services/productService.ts";
import type { Product } from "../types/product.ts";
import { placeholderProducts } from "../constants";

const Home = () => {
  const [womenTopWears, setWomenTopWears] = useState<Product[]>([]);
  const [loadingTopWears, setLoadingTopWears] = useState(true);

  useEffect(() => {
    let isMounted = true;
    productService
      .getProducts({ gender: "Women", category: "Top Wear", limit: 4 })
      .then((data) => {
        if (isMounted) {
          if (data?.products && data.products.length > 0) {
            setWomenTopWears(data.products);
          } else {
            setWomenTopWears(placeholderProducts.slice(0, 4) as unknown as Product[]);
          }
        }
      })
      .catch((err) => {
        console.warn("Could not fetch top wears for women:", err);
        if (isMounted) {
          setWomenTopWears(placeholderProducts.slice(0, 4) as unknown as Product[]);
        }
      })
      .finally(() => {
        if (isMounted) setLoadingTopWears(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

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
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
          </div>
        ) : (
          <ProductGrid products={womenTopWears} />
        )}
      </div>

      <FeaturedCollection />
      <FeaturesSection />
    </div>
  );
};

export default Home;
