import Header from "../Common/Header.tsx";
import Footer from "../Common/Footer.tsx";
import {Outlet} from "react-router-dom";

const UserLayout = () => {
    return (
        <>
            <Header />
            <main>
                <Outlet />
            </main>
            <Footer />
        </>
    )
}
export default UserLayout
