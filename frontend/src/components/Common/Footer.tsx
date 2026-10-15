import { useState } from "react";
import { Link } from "react-router-dom";
import { TbBrandMeta } from "react-icons/tb";
import { IoLogoInstagram } from "react-icons/io";
import { RiTwitterXLine } from "react-icons/ri";
import { FiPhoneCall } from "react-icons/fi";

const Footer = () => {
    const [email, setEmail] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Handle newsletter subscription
    };

    return (
        <footer className="border-t border-gray-200 py-12">
            <div className="container mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 px-4 lg:px-0">
                {/* Newsletter */}
                <div>
                    <h3 className="footer-heading">Newsletter</h3>
                    <p className="text-gray-500 mb-4 text-sm">
                        Be the first to hear about new products, exclusive events, and online offers.
                    </p>
                    <p className="font-medium text-sm text-gray-600 mb-6">
                        Sign up and get 10% off your first order.
                    </p>

                    {/* Newsletter Form */}
                    <form onSubmit={handleSubmit} className="flex">
                        <input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="input-base p-3 w-full border-r-0 rounded-l-md"
                            required
                        />
                        <button
                            type="submit"
                            className="btn-black px-6 py-3 text-sm rounded-r-md"
                        >
                            Subscribe
                        </button>
                    </form>
                </div>

                {/* Shop */}
                <div>
                    <h3 className="footer-heading">Shop</h3>
                    <ul className="space-y-2">
                        <li>
                            <Link to="#" className="footer-link">
                                Men's Top Wear
                            </Link>
                        </li>
                        <li>
                            <Link to="#" className="footer-link">
                                Women's Top Wear
                            </Link>
                        </li>
                        <li>
                            <Link to="#" className="footer-link">
                                Men's Bottom Wear
                            </Link>
                        </li>
                        <li>
                            <Link to="#" className="footer-link">
                                Women's Bottom Wear
                            </Link>
                        </li>
                    </ul>
                </div>

                {/* Support */}
                <div>
                    <h3 className="footer-heading">Support</h3>
                    <ul className="space-y-2">
                        <li>
                            <Link to="#" className="footer-link">
                                Contact Us
                            </Link>
                        </li>
                        <li>
                            <Link to="#" className="footer-link">
                                About Us
                            </Link>
                        </li>
                        <li>
                            <Link to="#" className="footer-link">
                                FAQs
                            </Link>
                        </li>
                        <li>
                            <Link to="#" className="footer-link">
                                Features
                            </Link>
                        </li>
                    </ul>
                </div>

                {/* Follow Us */}
                <div>
                    <h3 className="footer-heading">Follow Us</h3>
                    <div className="flex items-center space-x-4 mb-6">
                        <a
                            href="https://www.facebook.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="social-icon"
                        >
                            <TbBrandMeta className="h-5 w-5" />
                        </a>
                        <a
                            href="https://www.instagram.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="social-icon"
                        >
                            <IoLogoInstagram className="h-5 w-5" />
                        </a>
                        <a
                            href="https://twitter.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="social-icon"
                        >
                            <RiTwitterXLine className="h-4 w-4" />
                        </a>
                    </div>
                    <p className="text-gray-500">Call Us</p>
                    <p>
                        <FiPhoneCall className="inline-block mr-2" />
                        0123-456-789
                    </p>
                </div>
            </div>

            {/* Footer Bottom */}
            <div className="container mx-auto mt-12 px-4 lg:px-0 border-t border-gray-200 pt-6">
                <p className="text-gray-500 text-sm tracking-tight text-center">
                    &copy; 2024, ClassyTeam. All Rights Reserved.
                </p>
            </div>
        </footer>
    );
};

export default Footer;
