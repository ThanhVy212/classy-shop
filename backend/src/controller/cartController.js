import Product from "../models/Product.js";
import Cart from "../models/Cart.js";
import {
  findVariant,
  getAvailableStock,
  hasVariants,
} from "../services/variantService.js";

const getCart = async (userId, guestId) => {
  if (userId) {
    return await Cart.findOne({ user: userId });
  } else if (guestId) {
    return await Cart.findOne({ guestId });
  }

  return null;
};

const parseQuantity = (value) => {
  const quantity = Math.floor(Number(value));
  return Number.isFinite(quantity) && quantity > 0 ? quantity : null;
};

/**
 * Message used when a size/color combination cannot cover the requested
 * quantity. Variant products describe the specific combination so the shopper
 * knows which size or color is short.
 */
const buildStockMessage = (product, size, color, available) => {
  const variantLabel =
    size || color
      ? ` in ${[size, color].filter(Boolean).join(" / ")}`
      : "";

  if (available <= 0) {
    return hasVariants(product)
      ? `${product.name}${variantLabel} is out of stock.`
      : `${product.name} is out of stock.`;
  }

  return `${product.name}${variantLabel} only has ${available} left in stock.`;
};

export const addCartItem = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : null;
    const { productId, quantity: rawQuantity, size, color, guestId } = req.body;

    const quantity = parseQuantity(rawQuantity);

    if (!quantity) {
      return res.status(400).json({ message: "Invalid quantity." });
    }

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const available = getAvailableStock(product, size, color);

    if (hasVariants(product) && !findVariant(product, size, color)) {
      return res.status(400).json({
        message: `This combination is not available for ${product.name}.`,
      });
    }

    // Determine if the user is logged in or guest
    let cart = await getCart(userId, guestId);

    // If the cart exists, update it
    if (cart) {
      const productIndex = cart.products.findIndex(
        (p) =>
          p.productId.toString() === productId &&
          p.size === size &&
          p.color === color,
      );

      const existingQuantity =
        productIndex > -1 ? Number(cart.products[productIndex].quantity) || 0 : 0;
      const nextQuantity = existingQuantity + quantity;

      if (nextQuantity > available) {
        return res.status(409).json({
          message: buildStockMessage(product, size, color, available),
        });
      }

      if (productIndex > -1) {
        // If the product already exists, update the quantity
        cart.products[productIndex].quantity = nextQuantity;
      } else {
        // add new product
        cart.products.push({
          productId,
          name: product.name,
          image: product.images?.[0]?.url || "",
          price: product.price,
          size,
          color,
          quantity,
        });
      }

      // Recalculate the total price
      cart.totalPrice = cart.products.reduce(
        (acc, item) => acc + item.price * item.quantity,
        0,
      );

      await cart.save();
      return res.status(200).json(cart);
    } else {
      if (quantity > available) {
        return res.status(409).json({
          message: buildStockMessage(product, size, color, available),
        });
      }

      // Create a new cart for the guest or user
      const newCart = await Cart.create({
        user: userId ? userId : undefined,
        guestId: userId
          ? undefined
          : guestId || "guest_" + new Date().getTime(),
        products: [
          {
            productId,
            name: product.name,
            image: product.images?.[0]?.url || "",
            price: product.price,
            size,
            color,
            quantity,
          },
        ],
        totalPrice: product.price * quantity,
      });
      return res.status(201).json(newCart);
    }
  } catch (error) {
    console.error("add product to cart error:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

export const updateCartItem = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : null;
    const { productId, quantity: rawQuantity, size, color, guestId } = req.body;

    if (!userId && !guestId) {
      return res.status(400).json({ message: "UserId or guestId is required" });
    }

    const quantity = Math.floor(Number(rawQuantity));

    if (!Number.isFinite(quantity)) {
      return res.status(400).json({ message: "Invalid quantity." });
    }

    let cart = await getCart(userId, guestId);
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const productIndex = cart.products.findIndex(
      (p) =>
        p.productId.toString() === productId &&
        p.size === size &&
        p.color === color,
    );

    if (productIndex > -1) {
      // update quantity
      if (quantity > 0) {
        const product = await Product.findById(productId);

        if (!product) {
          return res.status(404).json({ message: "Product not found" });
        }

        const available = getAvailableStock(product, size, color);

        if (hasVariants(product) && !findVariant(product, size, color)) {
          return res.status(400).json({
            message: `This combination is not available for ${product.name}.`,
          });
        }

        if (quantity > available) {
          return res.status(409).json({
            message: buildStockMessage(product, size, color, available),
          });
        }

        cart.products[productIndex].quantity = quantity;
      } else {
        cart.products.splice(productIndex, 1); // Remove product if quantity is 0
      }

      cart.totalPrice = cart.products.reduce(
        (acc, item) => acc + item.price * item.quantity,
        0,
      );

      await cart.save();
      return res.status(200).json(cart);
    } else {
      return res.status(404).json({ message: "Product not found in cart" });
    }
  } catch (error) {
    console.error("update product in Cart error:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

export const deleteCartItem = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : null;
    const { productId, size, color, guestId } = req.body;

    if (!userId && !guestId) {
      return res.status(400).json({ message: "UserId or guestId is required" });
    }

    let cart = await getCart(userId, guestId);
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const productIndex = cart.products.findIndex(
      (p) =>
        p.productId.toString() === productId &&
        p.size === size &&
        p.color === color,
    );

    if (productIndex > -1) {
      cart.products.splice(productIndex, 1);
      cart.totalPrice = cart.products.reduce(
        (acc, item) => acc + item.price * item.quantity,
        0,
      );

      await cart.save();
      return res.status(200).json(cart);
    } else {
      return res.status(404).json({ message: "Product not found in cart" });
    }
  } catch (error) {
    console.error("Delete product in Cart error:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

export const getCartItem = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : null;
    const { guestId } = req.query;

    if (!userId && !guestId) {
      return res.status(400).json({ message: "UserId or guestId is required" });
    }

    const cart = await getCart(userId, guestId);
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    return res.status(200).json(cart);
  } catch (error) {
    console.error("Get product in Cart error:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

export const mergeGuestCart = async (req, res) => {
  try {
    const { guestId } = req.body;

    // Find the guest cart and user cart
    const guestCart = await Cart.findOne({ guestId });
    const userCart = await Cart.findOne({ user: req.user._id });

    if (guestCart) {
      if (guestCart.products.length === 0) {
        return res.status(400).json({ message: "Guest cart is empty" });
      }

      if (userCart) {
        // Merge guest cart into user cart
        guestCart.products.forEach((cartItem) => {
          const productIndex = userCart.products.findIndex(
            (item) =>
              item.productId.toString() === cartItem.productId.toString() &&
              item.size === cartItem.size &&
              item.color === cartItem.color,
          );

          if (productIndex > -1) {
            // If the items exists in the user cart, update the quantity
            userCart.products[productIndex].quantity += cartItem.quantity;
          } else {
            // Otherwise, add the guest item to the cart
            userCart.products.push(cartItem);
          }
        });

        userCart.totalPrice = userCart.products.reduce(
          (acc, item) => acc + item.price * item.quantity,
          0,
        );

        await userCart.save();

        // Remove guest cart after merging
        try {
          await Cart.findOneAndDelete({ guestId });
        } catch (error) {
          console.error("Error deleting guest car when merging: ", error);
        }
        res.status(200).json(userCart);
      } else {
        // If the user has no existing cart, assign the guest cart to the user
        guestCart.user = req.user._id;
        guestCart.guestId = undefined;
        await guestCart.save();

        res.status(200).json(guestCart);
      }
    } else {
      if (userCart) {
        // Guest cart has already been merged, return user cart
        return res.status(200).json(userCart);
      }
      res.status(404).json({ message: "Guest cart not found" });
    }
  } catch (error) {
    console.error("Merge guest cart error:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};
