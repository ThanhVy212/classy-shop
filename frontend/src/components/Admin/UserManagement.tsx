import React, { useState } from "react";
import {
    Search,
    UserPlus,
    Trash2,
    Shield,
    UserCheck,
    X,
    Filter,
    Mail
} from "lucide-react";
import Button from "../Common/Button.tsx";
import { toast } from "sonner";

const UserManagement = () => {
    const [users, setUsers] = useState<AdminUser[]>([
        {
            _id: "USR-001",
            name: "John Admin",
            email: "admin@classyshop.com",
            role: "admin",
            createdAt: "2026-01-15T08:30:00Z",
        },
        {
            _id: "USR-002",
            name: "Sarah Jenkins",
            email: "sarah.j@example.com",
            role: "customer",
            createdAt: "2026-02-20T14:15:00Z",
        },
        {
            _id: "USR-003",
            name: "Michael Chang",
            email: "m.chang@example.com",
            role: "customer",
            createdAt: "2026-03-05T10:00:00Z",
        },
        {
            _id: "USR-004",
            name: "Emma Watson",
            email: "emma.w@example.com",
            role: "customer",
            createdAt: "2026-04-12T19:40:00Z",
        },
        {
            _id: "USR-005",
            name: "Alexander Vance",
            email: "alex.v@classyshop.com",
            role: "admin",
            createdAt: "2026-05-18T11:25:00Z",
        },
        {
            _id: "USR-006",
            name: "Lisa Brown",
            email: "lisa.b@example.com",
            role: "customer",
            createdAt: "2026-06-22T09:10:00Z",
        },
    ]);

    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // New user form state
    const [newUserForm, setNewUserForm] = useState({
        name: "",
        email: "",
        role: "customer" as "admin" | "customer",
    });

    const filteredUsers = users.filter((u) => {
        const matchesSearch =
            u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole =
            roleFilter === "all" || u.role.toLowerCase() === roleFilter.toLowerCase();
        return matchesSearch && matchesRole;
    });

    const handleRoleChange = (userId: string, newRole: "admin" | "customer") => {
        setUsers((prev) =>
            prev.map((user) => (user._id === userId ? { ...user, role: newRole } : user))
        );
        toast.success(`User role changed to ${newRole.toUpperCase()}`);
    };

    const handleDeleteUser = (userId: string, userName: string) => {
        if (window.confirm(`Are you sure you want to remove user "${userName}"?`)) {
            setUsers((prev) => prev.filter((u) => u._id !== userId));
            toast.success(`User "${userName}" deleted successfully`);
        }
    };

    const handleCreateUser = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUserForm.name.trim() || !newUserForm.email.trim()) {
            toast.error("Please fill in both Name and Email");
            return;
        }

        const createdUser: AdminUser = {
            _id: `USR-${Math.floor(100 + Math.random() * 900)}`,
            name: newUserForm.name.trim(),
            email: newUserForm.email.trim(),
            role: newUserForm.role,
            createdAt: new Date().toISOString(),
        };

        setUsers((prev) => [createdUser, ...prev]);
        toast.success(`User "${createdUser.name}" added successfully`);
        setNewUserForm({ name: "", email: "", role: "customer" });
        setIsAddModalOpen(false);
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

                <Button
                    onClick={() => setIsAddModalOpen(true)}
                    className="btn-primary-action self-start sm:self-auto"
                >
                    <UserPlus className="w-4 h-4" />
                    <span>Add New User</span>
                </Button>
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
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="admin-filter-select"
                    >
                        <option value="all">All Roles</option>
                        <option value="admin">Administrators</option>
                        <option value="customer">Customers</option>
                    </select>
                </div>
            </div>

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
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map((user) => (
                                    <tr key={user._id} className="table-row-hover">
                                        <td className="py-4 px-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-gray-900 text-white font-bold flex items-center justify-center text-xs shrink-0">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900 line-clamp-1">
                                                        {user.name}
                                                    </p>
                                                    <span className="text-[11px] text-gray-400 font-mono">
                                                        #{user._id}
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
                                                    handleRoleChange(
                                                        user._id,
                                                        e.target.value as "admin" | "customer"
                                                    )
                                                }
                                                className="text-xs font-medium px-2.5 py-1.5 rounded-xl border border-gray-300 bg-white focus:outline-none cursor-pointer"
                                            >
                                                <option value="customer">Customer</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </td>
                                        <td className="py-4 px-5 text-xs text-gray-500 whitespace-nowrap">
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="py-4 px-5 text-right whitespace-nowrap">
                                            <button
                                                onClick={() => handleDeleteUser(user._id, user.name)}
                                                className="btn-action-delete"
                                                title="Delete user account"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
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
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="text-gray-400 hover:text-black p-1"
                            >
                                <X className="w-5 h-5" />
                            </button>
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
                                    Account Role
                                </label>
                                <select
                                    value={newUserForm.role}
                                    onChange={(e) =>
                                        setNewUserForm({
                                            ...newUserForm,
                                            role: e.target.value as "admin" | "customer",
                                        })
                                    }
                                    className="form-select"
                                >
                                    <option value="customer">Customer (Standard)</option>
                                    <option value="admin">Administrator (Full Access)</option>
                                </select>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="btn-outline py-2 text-xs"
                                >
                                    Cancel
                                </button>
                                <Button
                                    type="submit"
                                    className="btn-black px-5 py-2 rounded-xl text-xs font-semibold"
                                >
                                    Create Account
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
