import mongoose from "mongoose";

const variantSchema = new mongoose.Schema(
  {
    size: {
      type: String,
      required: true,
      trim: true,
    },
    color: {
      type: String,
      required: true,
      trim: true,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    sku: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    _id: false,
  },
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    discountPrice: {
      type: Number,
    },
    countInStock: {
      type: Number,
      required: true,
      default: 0,
    },
    sku: {
      type: String,
      unique: true,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    brand: {
      type: String,
    },
    sizes: {
      type: [String],
      required: true,
    },
    colors: {
      type: [String],
      required: true,
    },
    // Optional per size/color inventory. When this array has entries it is the
    // source of truth and countInStock is kept as the sum for catalog lists,
    // sorting and the low-stock dashboard. Empty means the product still uses
    // the product-level countInStock.
    variants: {
      type: [variantSchema],
      default: [],
    },
    collections: {
      type: String,
      required: true,
    },
    material: {
      type: String,
    },
    gender: {
      type: String,
      enum: ["Men", "Women", "Unisex"],
    },
    images: [
      {
        url: {
          type: String,
          required: true,
        },
        altText: {
          type: String,
        },
      },
    ],
    // Optional main image per color. Each entry maps a color from `colors` to
    // the single image that should become the main image when a shopper selects
    // that color. When a color has no entry the first `images` entry is used.
    colorImages: [
      {
        color: {
          type: String,
          required: true,
          trim: true,
        },
        images: [
          {
            url: {
              type: String,
              required: true,
            },
            altText: {
              type: String,
            },
          },
        ],
      },
    ],
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    rating: {
      type: Number,
      default: 0,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    tags: [String],
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    metaTitle: {
      type: String,
    },
    metaDescription: {
      type: String,
    },
    metaKeywords: {
      type: String,
    },
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
    },
    weight: Number,
  },
  { timestamps: true },
);

productSchema.pre("validate", function () {
  if (Array.isArray(this.variants) && this.variants.length > 0) {
    this.countInStock = this.variants.reduce(
      (total, variant) =>
        total + Math.max(0, Math.floor(Number(variant.stock) || 0)),
      0,
    );
  }
});

const Product = mongoose.model("Product", productSchema);

export default Product;
