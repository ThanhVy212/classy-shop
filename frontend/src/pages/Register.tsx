import {useState} from "react";
import logo from "../assets/logo.svg";
import Button from "../components/Common/Button.tsx";
import {Link} from "react-router-dom";
import registerPlaceholder from "../assets/register.webp";

const Register = () => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        console.log("Register information:",name, email, password);
    }


    return (
        <div className="flex">
            <div className="w-full md:w-1/2 flex flex-col justify-center items-center p-8 md:p-12">
                <form
                    onSubmit={handleSubmit}
                    className="auth-card"
                >
                    <div className="flex justify-center items-center gap-2 mb-6">
                        <img src={logo} alt="ClassyShop logo" className="w-14 h-14 object-contain" />
                        <h2 className="text-2xl font-medium">ClassyShop</h2>
                    </div>
                    <h2 className="text-2xl font-bold text-center mb-6">Sign Up</h2>
                    <p className="text-center mb-6">
                        Create your account to get started.
                    </p>
                    <div className="mb-4">
                        <label className="form-label">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="form-input"
                            placeholder="Enter your Name"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="form-label">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="form-input"
                            placeholder="Enter your email address"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="form-input"
                            placeholder="Enter your password"
                        />
                    </div>
                    <Button
                        type="submit"
                        className="btn-auth-submit"
                    >
                        Sign Up
                    </Button>
                    <p className="mt-6 text-center text-sm">
                        Already have an account?{" "}
                        <Link to="/login" className="text-blue-500">
                            Login
                        </Link>
                    </p>
                </form>
            </div>

            <div className="hidden md:block w-1/2 bg-gray-800">
                <div className="h-full flex flex-col justify-center items-center">
                    <img
                        src={registerPlaceholder}
                        alt="Register an Account"
                        className="h-[750px] w-full object-cover"
                    />
                </div>
            </div>
        </div>
    )
}
export default Register
