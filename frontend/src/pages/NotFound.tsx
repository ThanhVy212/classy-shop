import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Compass } from "lucide-react";

/**
 * Shared "route does not exist" screen.
 *
 * It is used both by the catch-all route and by the admin guard, so a
 * customer who opens an admin URL sees exactly the same response as someone
 * who mistyped any other URL.
 */
const NotFound = () => {
    const navigate = useNavigate();

    return (
        <section className="flex min-h-[70vh] items-center justify-center bg-[var(--color-canvas)] px-4 py-16">
            <div className="w-full max-w-lg text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                    <Compass className="h-6 w-6" />
                </span>

                <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--color-ink-muted)]">
                    Error 404
                </p>
                <h1 className="mt-2 text-5xl font-bold tracking-tight text-[var(--color-ink)] sm:text-6xl">
                    404
                </h1>
                <h2 className="mt-3 text-lg font-semibold text-[var(--color-ink)]">
                    This page could not be found
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-soft)]">
                    The page you are looking for does not exist or may have been moved.
                </p>

                <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                    <Link
                        to="/"
                        className="btn-black inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em]"
                    >
                        Back to home
                    </Link>
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="btn-outline inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em]"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Go back
                    </button>
                </div>
            </div>
        </section>
    );
};

export default NotFound;
