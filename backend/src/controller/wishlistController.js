import mongoose from "mongoose";
import Product from "../models/Product.js";
import Wishlist from "../models/Wishlist.js";

// Only the fields the storefront needs to render a wishlist card. Keeping the
// payload small also makes the wishlist cheap to fetch on every auth change.
const WISHLIST_PRODUCT_FIELDS =
  "name price discountPrice images countInStock category sizes colors isPublished";

const MAX_WISHLIST_ITEMS = 100;

const isValidProductId = (value) => mongoose.isValidObjectId(value);

const getWishlistQuery = (userId) =>
  Wishlist.findOne({ user: userId }).populate({
    path: "products.productId",
    select: WISHLIST_PRODUCT_FIELDS,
  });

/**
 * Shape the populated document for the client. Products deleted after being
 * saved are skipped instead of leaking a null card into the UI.
 */
const serializeWishlist = (wishlist) => {
  const items = (wishlist?.products ?? [])
    .filter((item) => item?.productId?._id)
    .map((item) => ({
      productId: String(item.productId._id),
      addedAt: item.addedAt,
      product: item.productId,
    }))
    .sort(
      (first, second) =>
        new Date(second.addedAt).getTime() -
        new Date(first.addedAt).getTime(),
    );

  return { items };
};

/**
 * Every signed-in customer has exactly one wishlist. Upserting keeps the call
 * safe when two tabs add the first item at the same time.
 */
const ensureWishlist = async (userId) => {
  try {
    return await Wishlist.findOneAndUpdate(
      { user: userId },
      { $setOnInsert: { user: userId, products: [] } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
  } catch (error) {
    if (error?.code === 11000) {
      return Wishlist.findOne({ user: userId });
    }
    throw error;
  }
};

/**
 * GET /api/wishlist
 * Returns the signed-in customer's saved products, newest first.
 */
export const getWishlist = async (req, res) => {
  try {
    const wishlist = await getWishlistQuery(req.user._id);
    return res.status(200).json(serializeWishlist(wishlist));
  } catch (error) {
    console.error("Get wishlist error:", error);
    return res.status(500).json({ message: "Could not load your wishlist." });
  }
};

/**
 * POST /api/wishlist
 * Saves a product once. Adding an existing product is a no-op so the heart
 * button stays idempotent.
 */
export const addWishlistItem = async (req, res) => {
  try {
    const { productId } = req.body ?? {};

    if (!isValidProductId(productId)) {
      return res.status(400).json({ message: "Invalid product." });
    }

    const product = await Product.findById(productId).select("_id");

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    const wishlist = await ensureWishlist(req.user._id);
    const alreadySaved = wishlist.products.some(
      (item) => String(item.productId) === String(product._id),
    );

    if (!alreadySaved && wishlist.products.length >= MAX_WISHLIST_ITEMS) {
      return res.status(400).json({
        message: `Your wishlist is full. You can save up to ${MAX_WISHLIST_ITEMS} products.`,
      });
    }

    await Wishlist.updateOne(
      {
        _id: wishlist._id,
        "products.productId": { $ne: product._id },
      },
      {
        $push: {
          products: {
            productId: product._id,
            addedAt: new Date(),
          },
        },
      },
    );

    const updated = await getWishlistQuery(req.user._id);
    return res.status(200).json(serializeWishlist(updated));
  } catch (error) {
    console.error("Add wishlist item error:", error);
    return res.status(500).json({ message: "Could not save this product." });
  }
};

/**
 * POST /api/wishlist/merge
 * Merges the guest wishlist kept in localStorage into the signed-in account.
 * Invalid, unpublished and duplicate ids are ignored.
 */
export const mergeWishlist = async (req, res) => {
  try {
    const rawIds = Array.isArray(req.body?.productIds)
      ? req.body.productIds
      : [];
    const productIds = Array.from(
      new Set(
        rawIds
          .filter(isValidProductId)
          .map((value) => String(value)),
      ),
    ).slice(0, MAX_WISHLIST_ITEMS);

    const wishlist = await ensureWishlist(req.user._id);

    if (productIds.length > 0) {
      const existingProducts = await Product.find({
        _id: { $in: productIds },
        isPublished: { $ne: false },
      })
        .select("_id")
        .lean();

      const alreadySaved = new Set(
        wishlist.products.map((item) => String(item.productId)),
      );
      const additions = existingProducts
        .map((product) => String(product._id))
        .filter((productId) => !alreadySaved.has(productId))
        .slice(0, MAX_WISHLIST_ITEMS - alreadySaved.size)
        .map((productId) => ({
          productId,
          addedAt: new Date(),
        }));

      if (additions.length > 0) {
        await Wishlist.updateOne(
          { _id: wishlist._id },
          { $push: { products: { $each: additions } } },
        );
      }
    }

    const updated = await getWishlistQuery(req.user._id);
    return res.status(200).json(serializeWishlist(updated));
  } catch (error) {
    console.error("Merge wishlist error:", error);
    return res.status(500).json({ message: "Could not sync your wishlist." });
  }
};

/**
 * DELETE /api/wishlist/:productId
 * Removes one product from the signed-in customer's wishlist.
 */
export const removeWishlistItem = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!isValidProductId(productId)) {
      return res.status(400).json({ message: "Invalid product." });
    }

    const updated = await Wishlist.findOneAndUpdate(
      { user: req.user._id },
      { $pull: { products: { productId } } },
      { new: true },
    ).populate({
      path: "products.productId",
      select: WISHLIST_PRODUCT_FIELDS,
    });

    return res.status(200).json(serializeWishlist(updated));
  } catch (error) {
    console.error("Remove wishlist item error:", error);
    return res
      .status(500)
      .json({ message: "Could not remove this product from your wishlist." });
  }
};

/**
 * DELETE /api/wishlist
 * Empties the signed-in customer's wishlist.
 */
export const clearWishlist = async (req, res) => {
  try {
    const updated = await Wishlist.findOneAndUpdate(
      { user: req.user._id },
      { $set: { products: [] } },
      { new: true },
    ).populate({
      path: "products.productId",
      select: WISHLIST_PRODUCT_FIELDS,
    });

    return res.status(200).json(serializeWishlist(updated));
  } catch (error) {
    console.error("Clear wishlist error:", error);
    return res.status(500).json({ message: "Could not clear your wishlist." });
  }
};
