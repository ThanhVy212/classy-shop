import Header from "../Common/Header.tsx";
import Footer from "../Common/Footer.tsx";
import OfflineBanner from "../Common/OfflineBanner.tsx";
import {Outlet} from "react-router-dom";

const UserLayout = () => {
    return (
        <>
            <Header />
            <main>
                <Outlet />
            </main>
            <Footer />
            <OfflineBanner />
        </>
    )
}
export default UserLayout
