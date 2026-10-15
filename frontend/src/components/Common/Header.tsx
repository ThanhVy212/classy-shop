import Topbar from "../Layout/Topbar.tsx";
import Navbar from "./Navbar.tsx";

const Header = () => {
    return (
        <header className="border-b border-gray-200">
            <Topbar />
            <Navbar />
        {/* Cart Drawer */}
        </header>
    )
}
export default Header
