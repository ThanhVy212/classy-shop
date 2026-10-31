import mongoose from "mongoose";
import Product from "../models/Product.js";
import { validateObjectId } from "../middlewares/validate.js";
import { ensureCatalogItems } from "../services/catalogService.js";

const syncProductCatalog = async (product) => {
  try {
    await ensureCatalogItems([
      { type: "category", name: product.category },
      { type: "brand", name: product.brand },
      { type: "material", name: product.material },
    ]);
  } catch (error) {
    console.error("Could not sync product values to catalog:", error);
  }
};

const DEFAULT_SIMILAR_LIMIT = 8;
const MAX_SIMILAR_LIMIT = 12;
const MAX_SIMILAR_CANDIDATES = 300;

const normalizeCatalogValue = (value) =>
  String(value ?? "").trim().toLowerCase();

const valuesMatch = (first, second) => {
  const normalizedFirst = normalizeCatalogValue(first);
  const normalizedSecond = normalizeCatalogValue(second);

  return Boolean(
    normalizedFirst &&
      normalizedSecond &&
      normalizedFirst === normalizedSecond,
  );
};

const countOverlap = (first = [], second = []) => {
  const secondValues = new Set(
    (Array.isArray(second) ? second : [])
      .map(normalizeCatalogValue)
      .filter(Boolean),
  );

  return (Array.isArray(first) ? first : []).reduce((count, value) => {
    return secondValues.has(normalizeCatalogValue(value)) ? count + 1 : count;
  }, 0);
};

const getComparablePrice = (product) => {
  const discountPrice = Number(product.discountPrice);

  if (Number.isFinite(discountPrice) && discountPrice > 0) {
    return discountPrice;
  }

  const price = Number(product.price);
  return Number.isFinite(price) && price > 0 ? price : 0;
};

const getPriceSimilarityScore = (source, candidate) => {
  const sourcePrice = getComparablePrice(source);
  const candidatePrice = getComparablePrice(candidate);

  if (!sourcePrice || !candidatePrice) return 0;

  const highestPrice = Math.max(sourcePrice, candidatePrice);
  const differenceRatio = Math.abs(sourcePrice - candidatePrice) / highestPrice;

  // Closer prices get up to 12 points.
  return Math.max(0, 1 - differenceRatio) * 12;
};

const getRecencyScore = (createdAt) => {
  if (!createdAt) return 0;

  const ageInDays = (Date.now() - new Date(createdAt).getTime()) / 86_400_000;

  if (!Number.isFinite(ageInDays) || ageInDays < 0) return 0;
  if (ageInDays <= 7) return 4;
  if (ageInDays <= 30) return 3;
  if (ageInDays <= 90) return 2;
  if (ageInDays <= 365) return 1;

  return 0;
};

/**
 * Score a candidate using catalog-backed attributes (category, brand,
 * material) plus other relevance signals. A higher score means the product is
 * more relevant to the product currently being viewed.
 */
const scoreCatalogSimilarity = (source, candidate) => {
  let score = 0;

  if (valuesMatch(source.category, candidate.category)) score += 40;
  if (valuesMatch(source.brand, candidate.brand)) score += 18;
  if (valuesMatch(source.material, candidate.material)) score += 16;
  if (valuesMatch(source.gender, candidate.gender)) score += 14;
  if (valuesMatch(source.collections, candidate.collections)) score += 10;

  score += Math.min(countOverlap(source.tags, candidate.tags) * 4, 12);
  score += Math.min(countOverlap(source.colors, candidate.colors) * 1.5, 6);
  score += Math.min(countOverlap(source.sizes, candidate.sizes), 4);
  score += getPriceSimilarityScore(source, candidate);

  const rating = Number(candidate.rating);
  if (Number.isFinite(rating)) {
    score += Math.max(0, Math.min(rating, 5)) * 0.8;
  }

  score += getRecencyScore(candidate.createdAt);

  return score;
};

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
      isPublished = true,
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
    await syncProductCatalog(createdProduct);
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
    await syncProductCatalog(updatedProduct);

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
      case "bestSelling":
        sort = { rating: -1, createdAt: -1 };
        break;

      case "featured":
        sort = { isFeatured: -1, createdAt: -1 };
        break;

      case "titleAsc":
        sort = { name: 1 };
        break;

      case "titleDesc":
        sort = { name: -1 };
        break;

      case "dateAsc":
        sort = { createdAt: 1 };
        break;

      case "dateDesc":
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

    // Find current product
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const requestedLimit = Number(req.query.limit);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(
          MAX_SIMILAR_LIMIT,
          Math.max(4, Math.floor(requestedLimit)),
        )
      : DEFAULT_SIMILAR_LIMIT;

    // Score a wide pool instead of taking the first products from one
    // category only. This lets newer and complementary products participate.
    const candidates = await Product.find({
      _id: { $ne: product._id },
      isPublished: { $ne: false },
    })
      .sort({ createdAt: -1 })
      .limit(MAX_SIMILAR_CANDIDATES)
      .lean();

    const rankedCandidates = candidates
      .map((candidate) => ({
        product: candidate,
        score: scoreCatalogSimilarity(product, candidate),
      }))
      .sort((first, second) => {
        if (second.score !== first.score) {
          return second.score - first.score;
        }

        return (
          new Date(second.product.createdAt || 0).getTime() -
          new Date(first.product.createdAt || 0).getTime()
        );
      });

    /*
     * Diversity selection:
     * - In the first pass, cap how many products may come from the same
     *   category or brand (half of the requested limit).
     * - The second pass fills any remaining slots by score, so the response is
     *   still full when a catalog has few values.
     *
     * Example: limit 8 + 5 products sharing a category => up to 4 products
     * from that category, then 4 more relevant products from other categories.
     */
    const perCategoryCap = Math.max(2, Math.ceil(limit / 2));
    const perBrandCap = Math.max(2, Math.ceil(limit / 2));
    const selectedIds = new Set([String(product._id)]);
    const categoryCounts = new Map();
    const brandCounts = new Map();
    const selectedCandidates = [];

    const addCandidate = (candidate, enforceDiversity) => {
      if (
        selectedCandidates.length >= limit ||
        selectedIds.has(String(candidate._id))
      ) {
        return false;
      }

      const categoryKey = normalizeCatalogValue(candidate.category);
      const brandKey = normalizeCatalogValue(candidate.brand);
      const categoryCount = categoryKey
        ? categoryCounts.get(categoryKey) || 0
        : 0;
      const brandCount = brandKey ? brandCounts.get(brandKey) || 0 : 0;

      if (
        enforceDiversity &&
        ((categoryKey && categoryCount >= perCategoryCap) ||
          (brandKey && brandCount >= perBrandCap))
      ) {
        return false;
      }

      selectedCandidates.push(candidate);
      selectedIds.add(String(candidate._id));

      if (categoryKey) {
        categoryCounts.set(categoryKey, categoryCount + 1);
      }
      if (brandKey) {
        brandCounts.set(brandKey, brandCount + 1);
      }

      return true;
    };

    // First pass: relevant + diverse.
    for (const entry of rankedCandidates) {
      if (selectedCandidates.length >= limit) break;
      addCandidate(entry.product, true);
    }

    // Second pass: fill remaining slots if the catalog is small.
    if (selectedCandidates.length < limit) {
      for (const entry of rankedCandidates) {
        if (selectedCandidates.length >= limit) break;
        addCandidate(entry.product, false);
      }
    }

    const similarProducts = selectedCandidates;

    return res.status(200).json({
      message: "Similar products retrieved successfully",
      total: similarProducts.length,
      similarProducts,
    });
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
