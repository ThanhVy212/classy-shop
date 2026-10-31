import {TbBrandMeta} from "react-icons/tb";
import {IoLogoInstagram} from "react-icons/io";
import {RiTwitterXLine} from "react-icons/ri";

const Topbar = () => {
    return (
        <div className="bg-[var(--color-primary)] text-[#f6f1e8]">
            <div className="container mx-auto flex justify-between items-center py-3 px-4">
                <div className="md:flex items-center space-x-4 hidden">
                    <a href="#" className="transition-colors hover:text-white">
                        <TbBrandMeta className="h-5 w-5" />
                    </a>
                    <a href="#" className="transition-colors hover:text-white">
                        <IoLogoInstagram className="h-5 w-5" />
                    </a>
                    <a href="#" className="transition-colors hover:text-white">
                        <RiTwitterXLine className="h-4 w-4" />
                    </a>
                </div>

                <div className="text-sm text-center flex-grow">
                    <span>We ship worldwide - Fast and reliable shipping!</span>
                </div>

                <div className="text-sm hidden md:block">
                    <a href="tel:+1234567890" className="transition-colors hover:text-white">+1 (234) 567-890</a>
                </div>
            </div>
        </div>
    )
}
export default Topbar
