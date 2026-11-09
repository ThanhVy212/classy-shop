import type { ReactNode } from "react";
import Header from "../Common/Header.tsx";
import Footer from "../Common/Footer.tsx";
import OfflineBanner from "../Common/OfflineBanner.tsx";
import { Outlet } from "react-router-dom";

interface UserLayoutProps {
    /**
     * Optional content. When omitted the layout renders the matched child
     * route through <Outlet />. Passing children lets the admin guard render
     * a storefront-styled 404 without navigating away from the requested URL.
     */
    children?: ReactNode;
}

const UserLayout = ({ children }: UserLayoutProps) => {
    return (
        <>
            <Header />
            <main>{children ?? <Outlet />}</main>
            <Footer />
            <OfflineBanner />
        </>
    )
}
export default UserLayout
