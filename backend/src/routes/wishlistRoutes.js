import express from "express";
import { protectedRoute } from "../middlewares/authMiddleware.js";
import {
  addWishlistItem,
  clearWishlist,
  getWishlist,
  mergeWishlist,
  removeWishlistItem,
} from "../controller/wishlistController.js";

const router = express.Router();

// @route GET /api/wishlist
// @desc Get the signed-in customer's wishlist
// @access Private
router.get("/", protectedRoute, getWishlist);

// @route POST /api/wishlist
// @desc Save a product to the signed-in customer's wishlist
// @access Private
router.post("/", protectedRoute, addWishlistItem);

// @route POST /api/wishlist/merge
// @desc Merge a guest wishlist (stored in localStorage) into the account
// @access Private
router.post("/merge", protectedRoute, mergeWishlist);

// @route DELETE /api/wishlist/:productId
// @desc Remove one product from the signed-in customer's wishlist
// @access Private
router.delete("/:productId", protectedRoute, removeWishlistItem);

// @route DELETE /api/wishlist
// @desc Clear the signed-in customer's wishlist
// @access Private
router.delete("/", protectedRoute, clearWishlist);

export default router;
