import mongoose from "mongoose";

export const CATALOG_TYPES = ["category", "brand", "material"];

const catalogItemSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: CATALOG_TYPES,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    nameKey: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// Prevent duplicate values (case-insensitive) inside the same catalog type.
catalogItemSchema.index({ type: 1, nameKey: 1 }, { unique: true });

catalogItemSchema.pre("validate", function () {
  if (this.name) {
    this.nameKey = this.name.trim().toLowerCase();
  }
});

const CatalogItem = mongoose.model("CatalogItem", catalogItemSchema);

export default CatalogItem;
