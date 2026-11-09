import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  Camera,
  HelpCircle,
  Heart,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  Package,
  ShieldCheck,
  ShoppingBag,
  User,
} from "lucide-react";
import { toast } from "sonner";
import MyOrders from "./MyOrders.tsx";
import { useAuth } from "../hooks/useAuth.ts";
import { authService } from "../services/authService";
import { getApiErrorMessage } from "../utils/apiError";
import Button from "../components/Common/Button.tsx";
import OptimizedImage from "../components/Common/OptimizedImage.tsx";

const getInitials = (name?: string) =>
  (name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "CS";

const formatMemberSince = (value?: string) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
};

const Profile = () => {
  const { user, logout, isAuthenticated, isAdmin, setUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      navigate("/login");
    } catch {
      toast.error("Failed to log out");
    }
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Please choose an image smaller than 5MB.");
      return;
    }

    setIsUploadingAvatar(true);

    try {
      const updated = await authService.uploadAvatar(file);
      setUser(updated);
      toast.success("Profile photo updated");
    } catch (uploadError) {
      toast.error(
        getApiErrorMessage(uploadError, "Could not update your profile photo."),
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] pb-16 pt-8 sm:pt-10">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="relative overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-8 sm:px-8 sm:py-10">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[var(--color-primary-soft)] blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 right-24 h-48 w-48 rounded-full bg-[var(--color-accent-soft)] blur-3xl" />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-4xl">
                Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}.
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--color-ink-soft)]">
                Review your orders, follow every delivery and manage your
                ClassyShop account in one calm place.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] text-xl font-semibold text-[var(--color-primary)] sm:h-20 sm:w-20">
                  {user?.avatarUrl ? (
                    <OptimizedImage
                      src={user.avatarUrl}
                      alt={user?.name || "Profile photo"}
                      widths={[64, 96, 160]}
                      sizes="80px"
                      crop="fill"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    getInitials(user?.name)
                  )}
                </span>
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--color-surface)] bg-[var(--color-primary)] text-white shadow-sm transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-wait disabled:opacity-70 sm:h-8 sm:w-8"
                  aria-label="Upload profile photo"
                  title="Upload profile photo">
                  {isUploadingAvatar ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin sm:h-4 sm:w-4" />
                  ) : (
                    <Camera className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  )}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  onChange={(event) => void handleAvatarChange(event)}
                  className="hidden"
                  aria-label="Choose a profile photo"
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
                  {user?.name || "ClassyShop customer"}
                </p>
                <p className="truncate text-xs text-[var(--color-ink-soft)]">
                  {user?.email || "No email available"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          {/* Account sidebar */}
          <aside className="space-y-5 lg:col-span-4">
            <div className="checkout-card overflow-hidden">
              <div className="border-b border-[var(--color-border)] px-5 py-4">
                <h2 className="text-sm font-semibold text-[var(--color-ink)]">
                  Account details
                </h2>
              </div>

              <dl className="divide-y divide-[var(--color-border)]">
                <div className="flex items-start gap-3 px-5 py-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                    <User className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
                      Name
                    </dt>
                    <dd className="mt-0.5 truncate text-sm font-medium text-[var(--color-ink)]">
                      {user?.name || "—"}
                    </dd>
                  </div>
                </div>

                <div className="flex items-start gap-3 px-5 py-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                    <Mail className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
                      Email
                    </dt>
                    <dd className="mt-0.5 truncate text-sm font-medium text-[var(--color-ink)]">
                      {user?.email || "—"}
                    </dd>
                  </div>
                </div>

                <div className="flex items-start gap-3 px-5 py-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                    <CalendarDays className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
                      Member since
                    </dt>
                    <dd className="mt-0.5 text-sm font-medium text-[var(--color-ink)]">
                      {formatMemberSince(user?.createdAt)}
                    </dd>
                  </div>
                </div>

                <div className="flex items-start gap-3 px-5 py-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
                      Account status
                    </dt>
                    <dd className="mt-0.5 text-sm font-medium text-[var(--color-ink)]">
                      {user?.isEmailVerified === false
                        ? "Email verification pending"
                        : "Verified account"}
                    </dd>
                  </div>
                </div>
              </dl>
            </div>

            <nav className="checkout-card overflow-hidden">
              <Link
                to="/profile"
                className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-primary-soft)]/60 px-5 py-3.5 text-sm font-semibold text-[var(--color-primary)]">
                <span className="inline-flex items-center gap-2.5">
                  <Package className="h-4 w-4" />
                  My orders
                </span>
                <span className="rounded-full bg-[var(--color-surface)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]">
                  Active
                </span>
              </Link>

              <Link
                to="/wishlist"
                className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-5 py-3.5 text-sm font-medium text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-surface-muted)]/50 hover:text-[var(--color-primary)]">
                <span className="inline-flex items-center gap-2.5">
                  <Heart className="h-4 w-4" />
                  My wishlist
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                to="/collections/all"
                className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-5 py-3.5 text-sm font-medium text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-surface-muted)]/50 hover:text-[var(--color-primary)]">
                <span className="inline-flex items-center gap-2.5">
                  <ShoppingBag className="h-4 w-4" />
                  Continue shopping
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              {isAdmin && (
                <Link
                  to="/admin"
                  className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-5 py-3.5 text-sm font-medium text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-surface-muted)]/50 hover:text-[var(--color-primary)]">
                  <span className="inline-flex items-center gap-2.5">
                    <LayoutDashboard className="h-4 w-4" />
                    Admin dashboard
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}

              {isAuthenticated && (
                <Button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left text-sm font-semibold text-[var(--color-danger)] transition-colors hover:bg-red-50">
                  <span className="inline-flex items-center gap-2.5">
                    <LogOut className="h-4 w-4 text-[var(--color-danger)]" />
                    Sign out
                  </span>
                </Button>
              )}
            </nav>

            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/60 p-5">
              <div className="flex items-start gap-3">
                <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-ink-soft)]" />
                <div>
                  <h3 className="text-sm font-semibold text-[var(--color-ink)]">
                    Need a hand?
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--color-ink-soft)]">
                    Our care team can help with sizing, deliveries, returns and
                    order changes.
                  </p>
                  <a
                    href="mailto:care@classyshop.com"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary)] underline underline-offset-2">
                    care@classyshop.com
                    <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </aside>

          {/* Orders */}
          <main className="lg:col-span-8">
            <MyOrders />
          </main>
        </div>
      </div>
    </div>
  );
};

export default Profile;
