import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import logo from "../assets/logo.svg";
import Button from "../components/Common/Button.tsx";
import registerPlaceholder from "../assets/register.webp";
import OAutGoogle from "../components/Common/OAuth.tsx";
import { registerSchema, type RegisterFormData } from "../validations/auth.ts";
import { useAuth } from "../hooks/useAuth.ts";
import { getApiErrorMessage } from "../services/authService.ts";

const Register = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { register: registerAuth, isAuthenticated } = useAuth();
    const [serverError, setServerError] = useState<string | null>(null);

    const searchParams = new URLSearchParams(location.search);
    const redirectParam = searchParams.get("redirect");
    const redirectPath = redirectParam ? (redirectParam.startsWith("/") ? redirectParam : `/${redirectParam}`) : null;
    const from = (location.state as { from?: { pathname: string } })?.from?.pathname || redirectPath || "/";

    useEffect(() => {
        if (isAuthenticated) {
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, from, navigate]);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
        },
    });

    const onSubmit = async (data: RegisterFormData) => {
        try {
            setServerError(null);
            const res = await registerAuth(data);
            toast.success(res.message || "Registration successful!");
            navigate(from, { replace: true });
        } catch (error) {
            const message = getApiErrorMessage(error, "Failed to register account. Please try again.");
            setServerError(message);
            toast.error(message);
        }
    };

    return (
        <div className="flex">
            <div className="w-full md:w-1/2 flex flex-col justify-center items-center p-8 md:p-12">
                <form
                    onSubmit={handleSubmit(onSubmit)}
                    noValidate
                    className="auth-card"
                >
                    <div className="flex justify-center items-center gap-2 mb-6">
                        <img src={logo} alt="ClassyShop logo" className="w-14 h-14 object-contain" />
                        <h2 className="text-2xl font-medium">ClassyShop</h2>
                    </div>
                    <h2 className="text-2xl font-bold text-center mb-6">Sign Up</h2>
                    <p className="text-center mb-6 text-gray-600">
                        Create your account to get started.
                    </p>

                    {serverError && (
                        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                            {serverError}
                        </div>
                    )}

                    <div className="mb-4">
                        <label className="form-label" htmlFor="name">Name</label>
                        <input
                            id="name"
                            type="text"
                            {...register("name")}
                            className={`form-input ${errors.name ? "border-red-500 focus:ring-red-500" : ""}`}
                            placeholder="Enter your Name"
                            aria-invalid={errors.name ? "true" : "false"}
                        />
                        {errors.name && (
                            <p className="mt-1.5 text-xs text-red-500 font-medium">
                                {errors.name.message}
                            </p>
                        )}
                    </div>
                    <div className="mb-4">
                        <label className="form-label" htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            {...register("email")}
                            className={`form-input ${errors.email ? "border-red-500 focus:ring-red-500" : ""}`}
                            placeholder="Enter your email address"
                            aria-invalid={errors.email ? "true" : "false"}
                        />
                        {errors.email && (
                            <p className="mt-1.5 text-xs text-red-500 font-medium">
                                {errors.email.message}
                            </p>
                        )}
                    </div>
                    <div className="mb-4">
                        <label className="form-label" htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            {...register("password")}
                            className={`form-input ${errors.password ? "border-red-500 focus:ring-red-500" : ""}`}
                            placeholder="Enter your password"
                            aria-invalid={errors.password ? "true" : "false"}
                        />
                        {errors.password && (
                            <p className="mt-1.5 text-xs text-red-500 font-medium">
                                {errors.password.message}
                            </p>
                        )}
                    </div>

                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn-auth-submit flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Creating Account...</span>
                            </>
                        ) : (
                            "Sign Up"
                        )}
                    </Button>

                    {/* Google OAuth Button */}
                    <div className="my-4">
                        <OAutGoogle />
                    </div>

                    <p className="mt-6 text-center text-sm">
                        Already have an account?{" "}
                        <Link
                            to={location.search ? `/login${location.search}` : "/login"}
                            state={location.state}
                            className="text-blue-500 hover:underline"
                        >
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
    );
};

export default Register;
