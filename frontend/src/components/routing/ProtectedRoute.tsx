import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.ts";
import { PageSkeleton } from "../Common/Skeletons.tsx";
import UserLayout from "../Layout/UserLayout.tsx";
import NotFound from "../../pages/NotFound.tsx";

const AuthLoadingScreen = () => <PageSkeleton />;

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
 * Requires a signed-in administrator.
 *
 * Guests and customers are NOT redirected to /login and their session is
 * never touched: doing either would reveal that the admin area exists and
 * would log customers out just for opening an admin URL. Instead they get the
 * exact same 404 screen as any unknown route, rendered with the storefront
 * chrome, while the URL stays unchanged.
 */
export const AdminRoute = ({ children }: RouteGuardProps) => {
    const { isAdmin, isLoading } = useAuth();

    if (isLoading) {
        return <AuthLoadingScreen />;
    }

    if (!isAdmin) {
        return (
            <UserLayout>
                <NotFound />
            </UserLayout>
        );
    }

    return <>{children}</>;
};
