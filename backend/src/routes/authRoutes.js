import express from "express";
import {
  getProfile,
  googleAuth,
  googleCallback,
  login,
  logout,
  refreshToken,
  register,
} from "../controller/authController.js";
import { protectedRoute } from "../middlewares/authMiddleware.js";
import {
  authRateLimit,
  loginRateLimit,
  refreshRateLimit,
  registerRateLimit,
} from "../middlewares/rateLimitMiddleware.js";

const router = express.Router();

router.get("/google", authRateLimit, googleAuth);
router.get("/callback/google", authRateLimit, googleCallback);

router.post("/register", authRateLimit, registerRateLimit, register);
router.post("/login", authRateLimit, loginRateLimit, login);
router.post("/logout", logout);
router.post("/refresh", refreshRateLimit, refreshToken);

router.get("/me", protectedRoute, getProfile);

export default router;
