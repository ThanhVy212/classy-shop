import express from "express";
import { optionalAuth, protectedRoute } from "../middlewares/authMiddleware.js";
import {
  addCartItem,
  deleteCartItem,
  getCartItem,
  mergeGuestCart,
  updateCartItem,
} from "../controller/cartController.js";

const router = express.Router();

// @route POST /api/cart
// @desc Add a product to the cart for a guest or logged in user
// @access Public (Optional Auth: uses req.user if logged in, guestId if guest)
router.post("/", optionalAuth, addCartItem);

// @route PUT /api/cart
// @desc Update product quantity in the cart for a guest or logged in user
// @access Public (Optional Auth: uses req.user if logged in, guestId if guest)
router.put("/", optionalAuth, updateCartItem);

// @route DELETE /api/cart
// @desc Remove a product from the cart
// @access Public (Optional Auth: uses req.user if logged in, guestId if guest)
router.delete("/", optionalAuth, deleteCartItem);

// @route GET /api/cart
// @desc Get logged-in user's or guest user's cart
// @access Public
router.get("/", optionalAuth, getCartItem);

// @route POST /api/cart/merge
// @desc Merge guest cart into user cart on login
// @access Prive
router.post("/merge", protectedRoute, mergeGuestCart);

export default router;
