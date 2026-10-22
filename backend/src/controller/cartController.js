import Product from "../models/Product.js";
import Cart from "../models/Cart.js";

const getCart = async (userId, guestId) => {
  if (userId) {
    return await Cart.findOne({ user: userId });
  } else if (guestId) {
    return await Cart.findOne({ guestId });
  }

  return null;
};

export const addCartItem = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : null;
    const { productId, quantity, size, color, guestId } = req.body;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

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

      if (productIndex > -1) {
        // If the product already exists, update the quantity
        cart.products[productIndex].quantity += quantity;
      } else {
        // add new product
        cart.products.push({
          productId,
          name: product.name,
          image: product.images[0].url,
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
            image: product.images[0].url,
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
    const { productId, quantity, size, color, guestId } = req.body;

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
      // update quantity
      if (quantity > 0) {
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
