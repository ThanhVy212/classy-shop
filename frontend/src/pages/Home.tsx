import Hero from "../components/Layout/Hero.tsx";
import GenderCollectionSection from "../components/Products/GenderCollectionSection.tsx";
import NewArrivals from "../components/Products/NewArrivals.tsx";
import ProductDetails from "../components/Products/ProductDetails.tsx";
import {placeholderProducts} from "../constants";
import ProductGrid from "../components/Products/ProductGrid.tsx";
import FeaturedCollection from "../components/Products/FeaturedCollection.tsx";
import FeaturesSection from "../components/Products/FeaturesSection.tsx";

const Home = () => {
    return (
        <div>
            <Hero />
            <GenderCollectionSection />
            <NewArrivals />

            {/* Best Seller */}
            <h2 className="text-3xl text-center font-bold mb-4">
                Best Seller
            </h2>
            <ProductDetails />

            <div className="container mx-auto">
                <h2 className="text-3xl text-center font-bold mb-4">
                    Top Wears for Women
                </h2>
                <ProductGrid products={placeholderProducts}/>
            </div>

            <FeaturedCollection />
            <FeaturesSection />
        </div>
    )
}
export default Home
