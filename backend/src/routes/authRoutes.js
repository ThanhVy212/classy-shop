import express from "express";
import {
  getProfile,
  googleAuth,
  googleCallback,
  login,
  logout,
  refreshToken,
  register,
  updateAvatar,
} from "../controller/authController.js";
import { protectedRoute } from "../middlewares/authMiddleware.js";
import { uploadSingle } from "../middlewares/uploadMiddleware.js";
import {
  authRateLimit,
  loginRateLimit,
  refreshRateLimit,
  registerRateLimit,
  uploadRateLimit,
} from "../middlewares/rateLimitMiddleware.js";

const router = express.Router();

router.get("/google", authRateLimit, googleAuth);
router.get("/callback/google", authRateLimit, googleCallback);

router.post("/register", authRateLimit, registerRateLimit, register);
router.post("/login", authRateLimit, loginRateLimit, login);
router.post("/logout", logout);
router.post("/refresh", refreshRateLimit, refreshToken);

router.get("/me", protectedRoute, getProfile);
router.post(
  "/avatar",
  protectedRoute,
  uploadRateLimit,
  uploadSingle("image"),
  updateAvatar,
);

export default router;
