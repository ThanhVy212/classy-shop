import mongoose from "mongoose";
import Product from "../models/Product.js";
import { validateObjectId } from "../middlewares/validate.js";

export const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      discountPrice,
      countInStock,
      category,
      brand,
      sizes,
      colors,
      collections,
      material,
      gender,
      images,
      isFeatured,
      isPublished,
      tags,
      dimensions,
      weight,
      sku,
    } = req.body;

    const product = new Product({
      name,
      description,
      price,
      discountPrice,
      countInStock,
      category,
      brand,
      sizes,
      colors,
      collections,
      material,
      gender,
      images,
      isFeatured,
      isPublished,
      tags,
      dimensions,
      weight,
      sku,
      user: req.user._id, // Reference to the admin user who created product
    });

    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      discountPrice,
      countInStock,
      category,
      brand,
      sizes,
      colors,
      collections,
      material,
      gender,
      images,
      isFeatured,
      isPublished,
      tags,
      dimensions,
      weight,
      sku,
    } = req.body;

    // Find product by ID
    const product = await Product.findById(req.params.id);

    // Check if product exists
    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    // Update product fields
    product.name = name ?? product.name;
    product.description = description ?? product.description;
    product.price = price ?? product.price;
    product.discountPrice = discountPrice ?? product.discountPrice;
    product.countInStock = countInStock ?? product.countInStock;
    product.category = category ?? product.category;
    product.brand = brand ?? product.brand;
    product.sizes = sizes ?? product.sizes;
    product.colors = colors ?? product.colors;
    product.collections = collections ?? product.collections;
    product.material = material ?? product.material;
    product.gender = gender ?? product.gender;
    product.images = images ?? product.images;
    product.isFeatured = isFeatured ?? product.isFeatured;
    product.isPublished = isPublished ?? product.isPublished;
    product.tags = tags ?? product.tags;
    product.dimensions = dimensions ?? product.dimensions;
    product.weight = weight ?? product.weight;
    product.sku = sku ?? product.sku;

    // Save updated product
    const updatedProduct = await product.save();

    return res.status(200).json({
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Update product error:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    // Find product by ID
    const product = await Product.findById(req.params.id);

    // Check if product exists
    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    await product.deleteOne();
    return res.status(200).json({ message: "Product removed" });
  } catch (error) {
    console.error("Delete product error:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

export const getProducts = async (req, res) => {
  try {
    const {
      collection,
      size,
      color,
      gender,
      minPrice,
      maxPrice,
      sortBy,
      search,
      category,
      material,
      brand,
      page = 1,
      limit = 10,
    } = req.query;

    // Pagination
    const currentPage = Math.max(1, Number(page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(limit) || 10));
    const skip = (currentPage - 1) * pageSize;

    // Filter logic
    const query = {};

    if (collection && collection.toLowerCase() !== "all") {
      query.collections = collection;
    }

    if (category && category.toLowerCase() !== "all") {
      query.category = category;
    }

    if (material) {
      query.material = {
        $in: material.split(","),
      };
    }

    if (brand) {
      query.brand = {
        $in: brand.split(","),
      };
    }

    if (size) {
      query.sizes = {
        $in: size.split(","),
      };
    }

    if (color) {
      query.colors = {
        $in: color.split(","),
      };
    }

    if (gender && gender.toLowerCase() !== "all") {
      query.gender = gender;
    }

    // Price filter
    const priceFilter = {};

    if (minPrice !== undefined && minPrice !== "") {
      priceFilter.$gte = Number(minPrice);
    }

    if (maxPrice !== undefined && maxPrice !== "") {
      priceFilter.$lte = Number(maxPrice);
    }

    if (Object.keys(priceFilter).length > 0) {
      query.price = priceFilter;
    }

    // Search logic
    if (search?.trim()) {
      query.$or = [
        {
          name: {
            $regex: search.trim(),
            $options: "i",
          },
        },
        {
          description: {
            $regex: search.trim(),
            $options: "i",
          },
        },
      ];
    }

    // Sort logic
    let sort = {};

    switch (sortBy) {
      case "priceAsc":
        sort = { price: 1 };
        break;

      case "priceDesc":
        sort = { price: -1 };
        break;

      case "popularity":
        sort = { rating: -1 };
        break;

      default:
        sort = { createdAt: -1 };
        break;
    }

    // Count total matching products
    const total = await Product.countDocuments(query);

    // Calculate pagination
    const totalPages = Math.ceil(total / pageSize);

    // Fetch products
    const products = await Product.find(query)
      .sort(sort)
      .skip(skip)
      .limit(pageSize);

    // Response
    return res.status(200).json({
      products,
      pagination: {
        total,
        page: currentPage,
        limit: pageSize,
        totalPages,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1,
      },
    });
  } catch (error) {
    console.error("Get products error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate product ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json({
      product,
    });
  } catch (error) {
    console.error("Get product by ID error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

export const getSimilarProductById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate product ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const similarProducts = await Product.find({
      _id: { $ne: id }, // Exclude the current product
      $or: [
        { gender: product.gender },
        { category: product.category },
        { collections: { $in: product.collections } },
        { brand: product.brand },
      ],
    }).limit(4);

    return res.status(200).json({ similarProducts });
  } catch (error) {
    console.error("Get similar product by ID error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

export const getBestsellerProduct = async (req, res) => {
  try {
    const bestSeller = await Product.findOne().sort({ rating: -1 });
    if (!bestSeller) {
      return res.status(404).json({ message: "No best seller found" });
    }

    return res.status(200).json({ bestSeller });
  } catch (error) {
    console.error("Get best seller product error:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

export const getNewarrivalsProduct = async (req, res) => {
  try {
    const newArrivals = await Product.find().sort({ createdAt: -1 }).limit(8);

    if (!newArrivals) {
      return res.status(404).json({ message: "No product found" });
    }

    return res.status(200).json({ newArrivals });
  } catch (error) {
    console.error("Get new arrivals product error:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};
