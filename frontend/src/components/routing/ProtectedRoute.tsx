import { useEffect, type ReactNode } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.ts";

const AuthLoadingScreen = () => (
    <div className="flex min-h-[70vh] items-center justify-center bg-[var(--color-canvas)]">
        <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]" />
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-ink-muted)]">
                Checking your access
            </p>
        </div>
    </div>
);

const loginRedirect = (pathname: string, search: string) =>
    `/login?redirect=${encodeURIComponent(`${pathname}${search}`)}`;

interface RouteGuardProps {
    children: ReactNode;
}

/**
 * Requires a signed-in user. Used for customer-only pages such as the
 * profile, checkout and order history.
 */
export const ProtectedRoute = ({ children }: RouteGuardProps) => {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return <AuthLoadingScreen />;
    }

    if (!isAuthenticated) {
        return (
            <Navigate
                to={loginRedirect(location.pathname, location.search)}
                replace
                state={{ from: location }}
            />
        );
    }

    return <>{children}</>;
};

/**
 * Requires a signed-in administrator. Unauthorized visitors are redirected
 * silently: no toast, no redirect hint and no indication that the admin area
 * exists. This prevents people from probing for protected routes.
 */
export const AdminRoute = ({ children }: RouteGuardProps) => {
    const { isAuthenticated, isAdmin, isLoading } = useAuth();
    const navigate = useNavigate();

    const isForbidden = !isLoading && isAuthenticated && !isAdmin;

    useEffect(() => {
        if (!isForbidden) return;
        navigate("/", { replace: true });
    }, [isForbidden, navigate]);

    if (isLoading) {
        return <AuthLoadingScreen />;
    }

    if (!isAuthenticated) {
        // Do not include a `redirect` param or state: after signing in, admins
        // still land on /admin automatically by role, while customers simply
        // land on the storefront.
        return <Navigate to="/login" replace />;
    }

    if (!isAdmin) {
        return null;
    }

    return <>{children}</>;
};
