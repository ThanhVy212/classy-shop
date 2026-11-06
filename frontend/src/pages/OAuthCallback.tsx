import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { useAuth } from "../hooks/useAuth.ts";
import { getApiErrorMessage } from "../services/authService.ts";

const MAX_AUTO_RETRIES = 2;
const MAX_AUTO_RETRY_DELAY_SECONDS = 45;

const getRetryAfterSeconds = (error: unknown): number | null => {
    if (!axios.isAxiosError(error) || error.response?.status !== 429) {
        return null;
    }

    const raw = error.response.headers?.["retry-after"];
    const parsed = Number(Array.isArray(raw) ? raw[0] : raw);

    // Never retry immediately: a 0 second value would spin in a tight loop.
    return Number.isFinite(parsed) && parsed >= 0
        ? Math.max(1, Math.ceil(parsed))
        : 30;
};

const formatWait = (seconds: number) => {
    if (seconds < 60) {
        return `${seconds} second${seconds === 1 ? "" : "s"}`;
    }

    const minutes = Math.ceil(seconds / 60);
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
};

const OAuthCallback = () => {
    const navigate = useNavigate();
    const { completeOAuthLogin } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [retryIn, setRetryIn] = useState<number | null>(null);
    const [attempt, setAttempt] = useState(0);
    const autoRetriesRef = useRef(0);

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

                const retryAfter = getRetryAfterSeconds(e);

                if (retryAfter !== null) {
                    // The Google callback already set a valid session cookie.
                    // A short rate-limit window is worth waiting out, so retry
                    // automatically instead of showing a login failure.
                    if (
                        retryAfter <= MAX_AUTO_RETRY_DELAY_SECONDS &&
                        autoRetriesRef.current < MAX_AUTO_RETRIES
                    ) {
                        autoRetriesRef.current += 1;
                        setError(null);
                        setRetryIn(retryAfter);
                        return;
                    }

                    setRetryIn(null);
                    setError(
                        `Sign-in is temporarily rate limited. Please wait about ${formatWait(
                            retryAfter,
                        )} and try again.`,
                    );
                    return;
                }

                setRetryIn(null);
                setError(
                    getApiErrorMessage(e, "Google sign-in failed. Please try again."),
                );
            }
        };

        finishLogin();

        return () => {
            isMounted = false;
        };
    }, [attempt, completeOAuthLogin, navigate]);

    // Count down to the next automatic attempt, then bump `attempt` so the
    // effect above runs the login again.
    useEffect(() => {
        if (retryIn === null) return;

        const timer = window.setTimeout(() => {
            if (retryIn <= 1) {
                setRetryIn(null);
                setAttempt((value) => value + 1);
                return;
            }

            setRetryIn(retryIn - 1);
        }, 1000);

        return () => window.clearTimeout(timer);
    }, [retryIn]);

    if (error) {
        return (
            <div className="flex min-h-[70vh] items-center justify-center bg-[var(--color-canvas)] px-4">
                <div className="w-full max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
                    <h1 className="mb-2 text-lg font-semibold text-red-700">
                        Google sign-in failed
                    </h1>
                    <p className="mb-6 text-sm text-red-600">{error}</p>
                    <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <button
                            type="button"
                            onClick={() => {
                                autoRetriesRef.current = 0;
                                setError(null);
                                setAttempt((value) => value + 1);
                            }}
                            className="inline-flex items-center justify-center rounded-lg bg-gray-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
                        >
                            Try again
                        </button>
                        <Link
                            to="/login"
                            replace
                            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                        >
                            Back to login
                        </Link>
                    </div>
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
                {retryIn !== null && (
                    <p className="text-sm text-[var(--color-ink-soft)]">
                        The server is busy. Retrying in {formatWait(retryIn)}…
                    </p>
                )}
            </div>
        </div>
    );
};

export default OAuthCallback;
