import mongoose from "mongoose";

export const DISCOUNT_TYPES = ["percentage", "fixed"];

const discountCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Discount code is required."],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [3, "Discount code must be at least 3 characters."],
      maxlength: [30, "Discount code must be at most 30 characters."],
      match: [
        /^[A-Z0-9_-]+$/,
        "Discount code can only contain letters, numbers, hyphens and underscores.",
      ],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, "Description must be at most 200 characters."],
      default: "",
    },
    type: {
      type: String,
      enum: DISCOUNT_TYPES,
      required: [true, "Discount type is required."],
    },
    // Percentage values are stored as whole percentages (10 = 10%).
    value: {
      type: Number,
      required: [true, "Discount value is required."],
      min: [0, "Discount value cannot be negative."],
    },
    // Only used by percentage discounts. null means there is no cap.
    maxDiscountAmount: {
      type: Number,
      default: null,
      min: [0, "Maximum discount cannot be negative."],
    },
    // Optional order subtotal required before the code can be applied.
    // null means the code works for any order value.
    minOrderAmount: {
      type: Number,
      default: null,
      min: [0, "Minimum order amount cannot be negative."],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

discountCodeSchema.pre("validate", function () {
  if (this.type === "percentage") {
    if (!(this.value > 0 && this.value <= 100)) {
      this.invalidate(
        "value",
        "Percentage discount must be greater than 0 and at most 100.",
      );
    }

    if (this.maxDiscountAmount != null && this.maxDiscountAmount <= 0) {
      this.invalidate(
        "maxDiscountAmount",
        "Maximum discount must be greater than 0.",
      );
    }
  }

  if (this.type === "fixed") {
    if (!(this.value > 0)) {
      this.invalidate("value", "Fixed discount must be greater than 0.");
    }

    this.maxDiscountAmount = null;
  }
});

discountCodeSchema.index({ isActive: 1, createdAt: -1 });

const DiscountCode = mongoose.model("DiscountCode", discountCodeSchema);

export default DiscountCode;
