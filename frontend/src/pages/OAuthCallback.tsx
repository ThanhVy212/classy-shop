import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../hooks/useAuth.ts";
import { getApiErrorMessage } from "../services/authService.ts";

const OAuthCallback = () => {
    const navigate = useNavigate();
    const { completeOAuthLogin } = useAuth();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const finishLogin = async () => {
            try {
                const user = await completeOAuthLogin();
                if (!isMounted) return;

                toast.success(`Welcome, ${user.name}!`);
                navigate(user.role === "admin" ? "/admin" : "/", { replace: true });
            } catch (e) {
                if (!isMounted) return;
                setError(
                    getApiErrorMessage(e, "Google sign-in failed. Please try again."),
                );
            }
        };

        finishLogin();

        return () => {
            isMounted = false;
        };
    }, [completeOAuthLogin, navigate]);

    if (error) {
        return (
            <div className="flex min-h-[70vh] items-center justify-center bg-[var(--color-canvas)] px-4">
                <div className="w-full max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
                    <h1 className="mb-2 text-lg font-semibold text-red-700">
                        Google sign-in failed
                    </h1>
                    <p className="mb-6 text-sm text-red-600">{error}</p>
                    <Link
                        to="/login"
                        replace
                        className="inline-flex items-center justify-center rounded-lg bg-gray-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
                    >
                        Back to login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-[70vh] items-center justify-center bg-[var(--color-canvas)]">
            <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-[var(--color-primary)]" />
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-ink-muted)]">
                    Signing you in with Google
                </p>
            </div>
        </div>
    );
};

export default OAuthCallback;
