import express from "express";
import { isAdmin, protectedRoute } from "../middlewares/authMiddleware.js";
import { getDashboard } from "../controller/dashboardController.js";

const router = express.Router();

// Every dashboard route requires an authenticated administrator.
router.use(protectedRoute, isAdmin);

// @route GET /api/admin/dashboard
// @desc Real store metrics for the admin overview page
// @access Private/admin
router.get("/", getDashboard);

export default router;
