import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "../models/User.js";
import Session from "../models/Session.js";

const USER_ROLES = ["admin", "customer"];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * GET /api/admin/users
 * Real registered accounts for the admin user management page.
 * Optional `search` and `role` query params keep filtering on the server.
 */
export const getAllUsers = async (req, res) => {
  try {
    const { search, role } = req.query;
    const filter = {};

    if (role && role !== "all") {
      if (!USER_ROLES.includes(role)) {
        return res.status(400).json({ message: "Invalid role filter." });
      }

      filter.role = role;
    }

    const term = String(search ?? "").trim();

    if (term) {
      const regex = new RegExp(escapeRegex(term), "i");
      filter.$or = [{ name: regex }, { email: regex }];
    }

    const users = await User.find(filter)
      .select("-passwordHash")
      .sort({ createdAt: -1 });

    return res.status(200).json({ users, total: users.length });
  } catch (error) {
    console.error("Get users error:", error);
    return res.status(500).json({ message: "Could not load users." });
  }
};

/**
 * POST /api/admin/users
 * Create an account from the admin panel with a password so the user can
 * sign in immediately without going through Google OAuth.
 */
export const createUser = async (req, res) => {
  try {
    const name = String(req.body?.name ?? "").trim();
    const email = String(req.body?.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(req.body?.password ?? "");
    const role = req.body?.role ?? "customer";

    if (!name || !email) {
      return res
        .status(400)
        .json({ message: "Name and email address are required." });
    }

    if (!EMAIL_PATTERN.test(email)) {
      return res
        .status(400)
        .json({ message: "Please enter a valid email address." });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters." });
    }

    if (!USER_ROLES.includes(role)) {
      return res.status(400).json({ message: "Invalid account role." });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res
        .status(409)
        .json({ message: "An account with that email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, role, passwordHash });

    return res.status(201).json({
      message: `User "${user.name}" created successfully.`,
      user: user.toJSON(),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ message: "An account with that email already exists." });
    }

    console.error("Create user error:", error);
    return res.status(500).json({ message: "Could not create this user." });
  }
};

/**
 * PATCH /api/admin/users/:id/role
 * Promote a customer to admin or demote an admin back to customer.
 */
export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body ?? {};

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: "User not found." });
    }

    if (!USER_ROLES.includes(role)) {
      return res.status(400).json({ message: "Invalid account role." });
    }

    if (String(req.user._id) === String(id) && role !== req.user.role) {
      return res
        .status(400)
        .json({ message: "You cannot change your own role." });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.role = role;
    await user.save();

    return res.status(200).json({
      message: `User role changed to ${role.toUpperCase()}.`,
      user: user.toJSON(),
    });
  } catch (error) {
    console.error("Update user role error:", error);
    return res.status(500).json({ message: "Could not update this user." });
  }
};

/**
 * DELETE /api/admin/users/:id
 * Remove an account and its refresh sessions. Existing orders stay intact
 * because they keep their own shipping and contact snapshot.
 */
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: "User not found." });
    }

    if (String(req.user._id) === String(id)) {
      return res
        .status(400)
        .json({ message: "You cannot delete your own account." });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    await Promise.all([
      user.deleteOne(),
      Session.deleteMany({ userId: user._id }),
    ]);

    return res
      .status(200)
      .json({ message: `User "${user.name}" deleted successfully.` });
  } catch (error) {
    console.error("Delete user error:", error);
    return res.status(500).json({ message: "Could not delete this user." });
  }
};
