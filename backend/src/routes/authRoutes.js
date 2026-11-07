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
import {
  createAddress,
  deleteAddress,
  getAddresses,
  setDefaultAddress,
  updateAddress,
} from "../controller/addressController.js";
import { protectedRoute } from "../middlewares/authMiddleware.js";
import { uploadSingle } from "../middlewares/uploadMiddleware.js";
import {
  authRateLimit,
  loginRateLimit,
  refreshIpRateLimit,
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
router.post("/refresh", refreshIpRateLimit, refreshRateLimit, refreshToken);

router.get("/me", protectedRoute, getProfile);

router.get("/addresses", protectedRoute, getAddresses);
router.post("/addresses", protectedRoute, createAddress);
router.patch("/addresses/:addressId", protectedRoute, updateAddress);
router.patch(
  "/addresses/:addressId/default",
  protectedRoute,
  setDefaultAddress,
);
router.delete("/addresses/:addressId", protectedRoute, deleteAddress);

router.post(
  "/avatar",
  protectedRoute,
  uploadRateLimit,
  uploadSingle("image"),
  updateAvatar,
);

export default router;
