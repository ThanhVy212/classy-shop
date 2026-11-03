import express from "express";
import { protectedRoute, isAdmin } from "../middlewares/authMiddleware.js";
import {
  uploadSingle,
  uploadMultiple,
} from "../middlewares/uploadMiddleware.js";
import {
  uploadSingleImage,
  uploadMultipleImages,
  deleteImage,
} from "../controller/uploadController.js";
import { uploadRateLimit } from "../middlewares/rateLimitMiddleware.js";

const router = express.Router();

// @route   POST /api/upload/single
// @desc    Upload 1 single image (multipart/form-data with key 'image')
// @access  Private / Admin
router.post(
  "/single",
  protectedRoute,
  isAdmin,
  uploadRateLimit,
  uploadSingle("image"),
  uploadSingleImage
);

// @route   POST /api/upload/multiple
// @desc    Upload multiple images (multipart/form-data with key 'images')
// @access  Private / Admin
router.post(
  "/multiple",
  protectedRoute,
  isAdmin,
  uploadRateLimit,
  uploadMultiple("images", 10),
  uploadMultipleImages
);

// @route   DELETE /api/upload
// @desc    Delete an image from Cloudinary by publicId
// @access  Private / Admin
router.delete("/", protectedRoute, isAdmin, uploadRateLimit, deleteImage);

export default router;
