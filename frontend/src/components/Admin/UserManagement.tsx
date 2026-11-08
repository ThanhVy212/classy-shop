import React, { useCallback, useEffect, useState } from "react";
import {
    AlertCircle,
    Filter,
    Loader2,
    Mail,
    RefreshCw,
    Search,
    Shield,
    Trash2,
    UserCheck,
    UserPlus,
    X,
} from "lucide-react";
import Button from "../Common/Button.tsx";
import ConfirmDialog from "../Common/ConfirmDialog.tsx";
import { toast } from "sonner";
import { useAuth } from "../../hooks/useAuth.ts";
import { userService } from "../../services/userService.ts";
import type { AdminUser } from "../../types/user.ts";
import type { UserRole } from "../../types/auth.ts";
import { getApiErrorMessage } from "../../utils/apiError.ts";

const UserManagement = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [busyUserId, setBusyUserId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [roleChangeTarget, setRoleChangeTarget] = useState<{
        user: AdminUser;
        nextRole: UserRole;
    } | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

    // New user form state
    const [newUserForm, setNewUserForm] = useState<{
        name: string;
        email: string;
        password: string;
        role: UserRole;
    }>({
        name: "",
        email: "",
        password: "",
        role: "customer",
    });

    const loadUsers = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const data = await userService.getUsers();
            setUsers(data.users);
        } catch (loadError) {
            setError(
                getApiErrorMessage(loadError, "Could not load users right now.")
            );
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadUsers();
    }, [loadUsers]);

    const filteredUsers = users.filter((u) => {
        const matchesSearch =
            u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === "all" || u.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const handleRoleChange = async (
        userId: string,
        newRole: UserRole
    ): Promise<boolean> => {
        const target = users.find((user) => user._id === userId);

        if (!target || target.role === newRole) return true;

        setBusyUserId(userId);

        try {
            const updated = await userService.updateUserRole(userId, newRole);
            setUsers((prev) =>
                prev.map((user) => (user._id === userId ? updated : user))
            );
            toast.success(`User role changed to ${newRole.toUpperCase()}`);
            return true;
        } catch (updateError) {
            toast.error(
                getApiErrorMessage(updateError, "Could not update this user's role.")
            );
            return false;
        } finally {
            setBusyUserId(null);
        }
    };

    const handleDeleteUser = async (
        userId: string,
        userName: string
    ): Promise<boolean> => {
        setBusyUserId(userId);

        try {
            await userService.deleteUser(userId);
            setUsers((prev) => prev.filter((u) => u._id !== userId));
            toast.success(`User "${userName}" deleted successfully`);
            return true;
        } catch (deleteError) {
            toast.error(
                getApiErrorMessage(deleteError, "Could not delete this user.")
            );
            return false;
        } finally {
            setBusyUserId(null);
        }
    };

    const roleLabel = (role: UserRole) =>
        role === "admin" ? "Administrator" : "Customer";

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newUserForm.name.trim() || !newUserForm.email.trim()) {
            toast.error("Please fill in both Name and Email");
            return;
        }

        if (newUserForm.password.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }

        setIsCreating(true);

        try {
            const createdUser = await userService.createUser({
                name: newUserForm.name.trim(),
                email: newUserForm.email.trim(),
                password: newUserForm.password,
                role: newUserForm.role,
            });

            setUsers((prev) => [createdUser, ...prev]);
            toast.success(`User "${createdUser.name}" added successfully`);
            setNewUserForm({
                name: "",
                email: "",
                password: "",
                role: "customer",
            });
            setIsAddModalOpen(false);
        } catch (createError) {
            toast.error(
                getApiErrorMessage(createError, "Could not create this user.")
            );
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="page-title">
                            Users Management
                        </h1>
                        <span className="badge-counter">
                            {users.length} registered
                        </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                        Control user access, assign administrator privileges, and manage accounts.
                    </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <Button
                        type="button"
                        onClick={() => void loadUsers()}
                        disabled={isLoading}
                        className="btn-outline inline-flex items-center gap-2"
                    >
                        <RefreshCw
                            className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                        />
                        <span>Refresh</span>
                    </Button>

                    <Button
                        onClick={() => setIsAddModalOpen(true)}
                        className="btn-primary-action"
                    >
                        <UserPlus className="w-4 h-4" />
                        <span>Add New User</span>
                    </Button>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="relative w-full sm:w-96">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by name or email address..."
                        className="admin-search-input"
                    />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Filter className="w-4 h-4 text-gray-400 shrink-0" />
                    <select
                        value={roleFilter}
                        onChange={(e) =>
                            setRoleFilter(e.target.value as UserRole | "all")
                        }
                        className="admin-filter-select"
                    >
                        <option value="all">All Roles</option>
                        <option value="admin">Administrators</option>
                        <option value="customer">Customers</option>
                    </select>
                </div>
            </div>

            {error && (
                <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="flex-1">
                        <p>{error}</p>
                        <Button
                            type="button"
                            onClick={() => void loadUsers()}
                            className="mt-2 text-xs font-semibold underline underline-offset-2"
                        >
                            Try again
                        </Button>
                    </div>
                </div>
            )}

            {/* Users Table */}
            <div className="card-container">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="table-head-row">
                            <tr>
                                <th className="py-3.5 px-5">User</th>
                                <th className="py-3.5 px-5">Email Address</th>
                                <th className="py-3.5 px-5">Role</th>
                                <th className="py-3.5 px-5">Change Role</th>
                                <th className="py-3.5 px-5">Joined</th>
                                <th className="py-3.5 px-5 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-gray-500">
                                        <Loader2 className="w-5 h-5 mx-auto animate-spin" />
                                        <span className="mt-2 block">Loading users...</span>
                                    </td>
                                </tr>
                            ) : filteredUsers.length > 0 ? (
                                filteredUsers.map((user) => {
                                    const isSelf = currentUser?._id === user._id;
                                    const isBusy = busyUserId === user._id;

                                    return (
                                        <tr
                                            key={user._id}
                                            className={`table-row-hover ${isBusy ? "opacity-60" : ""}`}
                                        >
                                            <td className="py-4 px-5">
                                                <div className="flex items-center gap-3">
                                                    {user.avatarUrl ? (
                                                        <img
                                                            src={user.avatarUrl}
                                                            alt=""
                                                            className="w-9 h-9 rounded-full object-cover shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="w-9 h-9 rounded-full bg-gray-900 text-white font-bold flex items-center justify-center text-xs shrink-0">
                                                            {user.name.charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-semibold text-gray-900 line-clamp-1">
                                                            {user.name}
                                                            {isSelf && (
                                                                <span className="ml-1.5 text-[11px] font-normal text-gray-400">
                                                                    (you)
                                                                </span>
                                                            )}
                                                        </p>
                                                        <span
                                                            className="text-[11px] text-gray-400 font-mono"
                                                            title={user._id}
                                                        >
                                                            #{user._id.slice(-8)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-5">
                                                <div className="flex items-center gap-1.5 text-gray-700">
                                                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                                                    <span>{user.email}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-5 whitespace-nowrap">
                                                {user.role === "admin" ? (
                                                    <span className="status-badge status-badge-purple">
                                                        <Shield className="w-3 h-3" /> Admin
                                                    </span>
                                                ) : (
                                                    <span className="status-badge status-badge-neutral">
                                                        <UserCheck className="w-3 h-3" /> Customer
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-4 px-5 whitespace-nowrap">
                                                <select
                                                    value={user.role}
                                                    onChange={(e) =>
                                                        setRoleChangeTarget({
                                                            user,
                                                            nextRole: e.target.value as UserRole,
                                                        })
                                                    }
                                                    disabled={isBusy || isSelf}
                                                    title={
                                                        isSelf
                                                            ? "You cannot change your own role"
                                                            : undefined
                                                    }
                                                    className="text-xs font-medium px-2.5 py-1.5 rounded-xl border border-gray-300 bg-white focus:outline-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                                >
                                                    <option value="customer">Customer</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                            </td>
                                            <td className="py-4 px-5 text-xs text-gray-500 whitespace-nowrap">
                                                {new Date(user.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="py-4 px-5 text-right whitespace-nowrap">
                                                <Button
                                                    type="button"
                                                    onClick={() => setDeleteTarget(user)}
                                                    disabled={isBusy || isSelf}
                                                    className="btn-action-delete disabled:opacity-40 disabled:cursor-not-allowed"
                                                    title={
                                                        isSelf
                                                            ? "You cannot delete your own account"
                                                            : "Delete user account"
                                                    }
                                                >
                                                    {isBusy ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-4 h-4" />
                                                    )}
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-gray-500">
                                        No users found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="table-footer">
                    <span>
                        Showing {filteredUsers.length} of {users.length} users
                    </span>
                    <span className="font-medium">ClassyShop Identity Service</span>
                </div>
            </div>

            {/* Add User Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                            <h3 className="card-title">Add New User</h3>
                            <Button
                                type="button"
                                aria-label="Close add user dialog"
                                onClick={() => setIsAddModalOpen(false)}
                                disabled={isCreating}
                                className="text-gray-400 hover:text-black p-1"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        <form onSubmit={handleCreateUser} className="space-y-4 pt-4">
                            <div>
                                <label className="form-label">
                                    Full Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={newUserForm.name}
                                    onChange={(e) =>
                                        setNewUserForm({ ...newUserForm, name: e.target.value })
                                    }
                                    placeholder="Jane Doe"
                                    className="form-input"
                                />
                            </div>

                            <div>
                                <label className="form-label">
                                    Email Address *
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={newUserForm.email}
                                    onChange={(e) =>
                                        setNewUserForm({ ...newUserForm, email: e.target.value })
                                    }
                                    placeholder="jane@example.com"
                                    className="form-input"
                                />
                            </div>

                            <div>
                                <label className="form-label">
                                    Password *
                                </label>
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    value={newUserForm.password}
                                    onChange={(e) =>
                                        setNewUserForm({
                                            ...newUserForm,
                                            password: e.target.value,
                                        })
                                    }
                                    placeholder="At least 6 characters"
                                    className="form-input"
                                    autoComplete="new-password"
                                />
                            </div>

                            <div>
                                <label className="form-label">
                                    Account Role
                                </label>
                                <select
                                    value={newUserForm.role}
                                    onChange={(e) =>
                                        setNewUserForm({
                                            ...newUserForm,
                                            role: e.target.value as UserRole,
                                        })
                                    }
                                    className="form-select"
                                >
                                    <option value="customer">Customer (Standard)</option>
                                    <option value="admin">Administrator (Full Access)</option>
                                </select>
                            </div>

                            <p className="text-xs text-gray-500">
                                The user can sign in immediately with this email and password.
                            </p>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                                <Button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    disabled={isCreating}
                                    className="btn-outline py-2 text-xs"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isCreating}
                                    className="btn-black px-5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-2"
                                >
                                    {isCreating && (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    )}
                                    {isCreating ? "Creating..." : "Create Account"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmDialog
                open={roleChangeTarget !== null}
                title="Change account role?"
                description={
                    roleChangeTarget && (
                        <>
                            Change <strong>{roleChangeTarget.user.name}</strong> from{" "}
                            <strong>{roleLabel(roleChangeTarget.user.role)}</strong> to{" "}
                            <strong>{roleLabel(roleChangeTarget.nextRole)}</strong>? This
                            takes effect immediately.
                        </>
                    )
                }
                confirmLabel="Change role"
                isSubmitting={busyUserId === roleChangeTarget?.user._id}
                onClose={() => {
                    if (busyUserId !== roleChangeTarget?.user._id) {
                        setRoleChangeTarget(null);
                    }
                }}
                onConfirm={async () => {
                    if (!roleChangeTarget) return;

                    const { user, nextRole } = roleChangeTarget;
                    const saved = await handleRoleChange(user._id, nextRole);

                    if (saved) {
                        setRoleChangeTarget(null);
                    }
                }}
            />

            <ConfirmDialog
                open={deleteTarget !== null}
                title="Delete user?"
                tone="danger"
                confirmLabel="Delete user"
                cancelLabel="Keep user"
                isSubmitting={busyUserId === deleteTarget?._id}
                description={
                    deleteTarget && (
                        <>
                            Permanently delete <strong>{deleteTarget.name}</strong> (
                            {deleteTarget.email})? Their sign-in sessions will be ended
                            and this cannot be undone.
                        </>
                    )
                }
                onClose={() => {
                    if (busyUserId !== deleteTarget?._id) {
                        setDeleteTarget(null);
                    }
                }}
                onConfirm={async () => {
                    if (!deleteTarget) return;

                    const saved = await handleDeleteUser(
                        deleteTarget._id,
                        deleteTarget.name
                    );

                    if (saved) {
                        setDeleteTarget(null);
                    }
                }}
            />
        </div>
    );
};

export default UserManagement;
