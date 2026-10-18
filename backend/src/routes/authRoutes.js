import express from "express";
import {
  getProfile,
  login,
  logout,
  refreshToken,
  register,
} from "../controller/authController.js";
import { protectedRoute } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh", refreshToken);

router.get("/me", protectedRoute, getProfile);

export default router;
