import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import Button from "../components/Common/Button.tsx";
import logo from "../assets/logo.svg";
import loginPlaceholder from "../assets/login.webp";
import OAutGoogle from "../components/Common/OAuth.tsx";
import { loginSchema, type LoginFormData } from "../validations/auth.ts";
import type { UserRole } from "../types/auth.ts";
import { useAuth } from "../hooks/useAuth.ts";
import { getApiErrorMessage } from "../services/authService.ts";

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, isAuthenticated, user } = useAuth();
    const [serverError, setServerError] = useState<string | null>(null);

    const searchParams = new URLSearchParams(location.search);
    const redirectParam = searchParams.get("redirect");
    const redirectPath = redirectParam ? (redirectParam.startsWith("/") ? redirectParam : `/${redirectParam}`) : null;
    const stateFrom = (location.state as { from?: { pathname: string } })?.from?.pathname;
    const explicitPath = stateFrom || redirectPath || null;
    const oauthError = searchParams.get("oauth") === "error";

    // Admins land in the admin panel by default, while customers land in the
    // storefront. A customer must never be sent to an admin-only destination.
    const resolveDestination = (role?: UserRole) => {
        if (explicitPath?.startsWith("/admin") && role !== "admin") {
            return "/";
        }
        if (explicitPath) {
            return explicitPath;
        }
        return role === "admin" ? "/admin" : "/";
    };

    const from = resolveDestination(user?.role);

    useEffect(() => {
        if (isAuthenticated) {
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, from, navigate]);

    useEffect(() => {
        if (oauthError) {
            setServerError("Google sign-in was cancelled or failed. Please try again.");
        }
    }, [oauthError]);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const onSubmit = async (data: LoginFormData) => {
        try {
            setServerError(null);
            const res = await login(data);
            toast.success(res.message || "Login successful!");
            navigate(resolveDestination(res.user?.role), { replace: true });
        } catch (error) {
            const message = getApiErrorMessage(error, "Failed to login. Please try again.");
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
                    <h2 className="text-2xl font-bold text-center mb-6">Hey there!</h2>
                    <p className="text-center mb-6 text-gray-600">
                        Enter your email and password to login
                    </p>

                    {serverError && (
                        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                            {serverError}
                        </div>
                    )}

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
                                <span>Signing In...</span>
                            </>
                        ) : (
                            "Sign In"
                        )}
                    </Button>

                    {/* Google OAuth Button */}
                    <div className="my-4">
                        <OAutGoogle />
                    </div>

                    <p className="mt-6 text-center text-sm">
                        Don't have an account?{" "}
                        <Link
                            to={location.search ? `/register${location.search}` : "/register"}
                            state={location.state}
                            className="text-blue-500 hover:underline"
                        >
                            Register
                        </Link>
                    </p>
                </form>
            </div>

            <div className="hidden md:block w-1/2 bg-gray-800">
                <div className="h-full flex flex-col justify-center items-center">
                    <img
                        src={loginPlaceholder}
                        alt="Login to Account"
                        className="h-[750px] w-full object-cover"
                    />
                </div>
            </div>
        </div>
    );
};

export default Login;
