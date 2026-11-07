import express from "express";
import { isAdmin, protectedRoute } from "../middlewares/authMiddleware.js";
import {
  createUser,
  deleteUser,
  getAllUsers,
  updateUserRole,
} from "../controller/adminUserController.js";

const router = express.Router();

// Every user management route requires an authenticated administrator.
router.use(protectedRoute, isAdmin);

// @route GET /api/admin/users
// @desc List registered accounts
// @access Private/admin
router.get("/", getAllUsers);

// @route POST /api/admin/users
// @desc Create an account
// @access Private/admin
router.post("/", createUser);

// @route PATCH /api/admin/users/:id/role
// @desc Update an account's role
// @access Private/admin
router.patch("/:id/role", updateUserRole);

// @route DELETE /api/admin/users/:id
// @desc Delete an account
// @access Private/admin
router.delete("/:id", deleteUser);

export default router;
