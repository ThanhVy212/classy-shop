import mongoose from "mongoose";
import DiscountCode, { DISCOUNT_TYPES } from "../models/DiscountCode.js";
import {
  normalizeDiscountCode,
  validateDiscountCode,
} from "../services/discountService.js";

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * POST /api/discounts/validate
 * Public preview endpoint used by checkout. The order endpoint still
 * recalculates the discount from the database before saving an order.
 */
export const validateDiscountForCheckout = async (req, res) => {
  try {
    const subtotal = Number(req.body?.subtotal);

    if (!Number.isFinite(subtotal) || subtotal <= 0) {
      return res.status(400).json({
        message: "A valid order subtotal is required to apply a discount.",
      });
    }

    const result = await validateDiscountCode(req.body?.code, subtotal);

    if (result.error) {
      return res.status(400).json({ message: result.error });
    }

    return res.status(200).json({ discount: result.discount });
  } catch (error) {
    console.error("Validate discount error:", error);
    return res.status(500).json({ message: "Could not validate this discount code." });
  }
};

/**
 * GET /api/admin/discounts
 */
export const getAllDiscounts = async (req, res) => {
  try {
    const { search } = req.query;
    const filter = {};

    if (search && String(search).trim()) {
      const regex = new RegExp(escapeRegex(String(search).trim()), "i");
      filter.$or = [{ code: regex }, { description: regex }];
    }

    const discounts = await DiscountCode.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({ discounts });
  } catch (error) {
    console.error("Get discounts error:", error);
    return res.status(500).json({ message: "Could not load discount codes." });
  }
};

/**
 * POST /api/admin/discounts
 */
export const createDiscount = async (req, res) => {
  try {
    const {
      code,
      description,
      type,
      value,
      maxDiscountAmount,
      minOrderAmount,
      isActive,
    } = req.body ?? {};

    const normalizedCode = normalizeDiscountCode(code);

    if (!/^[A-Z0-9_-]{3,30}$/.test(normalizedCode)) {
      return res.status(400).json({
        message:
          "Discount code must be 3–30 characters using letters, numbers, hyphens or underscores.",
      });
    }

    if (!DISCOUNT_TYPES.includes(type)) {
      return res.status(400).json({ message: "Invalid discount type." });
    }

    const numericValue = Number(value);

    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      return res.status(400).json({
        message: "Discount value must be greater than 0.",
      });
    }

    if (type === "percentage" && numericValue > 100) {
      return res.status(400).json({
        message: "Percentage discount cannot be greater than 100%.",
      });
    }

    let maxCap = null;

    if (
      type === "percentage" &&
      maxDiscountAmount !== undefined &&
      maxDiscountAmount !== null &&
      String(maxDiscountAmount).trim() !== ""
    ) {
      maxCap = Number(maxDiscountAmount);

      if (!Number.isFinite(maxCap) || maxCap <= 0) {
        return res.status(400).json({
          message: "Maximum discount amount must be greater than 0.",
        });
      }
    }

    let minimumOrder = null;

    if (
      minOrderAmount !== undefined &&
      minOrderAmount !== null &&
      String(minOrderAmount).trim() !== ""
    ) {
      minimumOrder = Number(minOrderAmount);

      if (!Number.isFinite(minimumOrder) || minimumOrder < 0) {
        return res.status(400).json({
          message: "Minimum order amount cannot be negative.",
        });
      }

      if (minimumOrder === 0) {
        minimumOrder = null;
      }
    }

    const existing = await DiscountCode.findOne({ code: normalizedCode });

    if (existing) {
      return res.status(409).json({
        message: "A discount code with that code already exists.",
      });
    }

    const discount = await DiscountCode.create({
      code: normalizedCode,
      description: String(description || "").trim(),
      type,
      value: numericValue,
      maxDiscountAmount: type === "percentage" ? maxCap : null,
      minOrderAmount: minimumOrder,
      isActive: isActive !== false,
    });

    return res.status(201).json({
      message: "Discount code created.",
      discount,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        message: "A discount code with that code already exists.",
      });
    }

    if (error?.name === "ValidationError") {
      const message = Object.values(error.errors)[0]?.message;
      return res.status(400).json({
        message: message || "Invalid discount code details.",
      });
    }

    console.error("Create discount error:", error);
    return res.status(500).json({ message: "Could not create the discount code." });
  }
};

/**
 * PATCH /api/admin/discounts/:id/status
 */
export const updateDiscountStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body ?? {};

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: "Discount code not found." });
    }

    if (typeof isActive !== "boolean") {
      return res.status(400).json({ message: "isActive must be a boolean." });
    }

    const discount = await DiscountCode.findById(id);

    if (!discount) {
      return res.status(404).json({ message: "Discount code not found." });
    }

    discount.isActive = isActive;
    await discount.save();

    return res.status(200).json({
      message: `Discount code ${isActive ? "activated" : "deactivated"}.`,
      discount,
    });
  } catch (error) {
    console.error("Update discount status error:", error);
    return res.status(500).json({ message: "Could not update the discount code." });
  }
};

/**
 * DELETE /api/admin/discounts/:id
 */
export const deleteDiscount = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: "Discount code not found." });
    }

    const discount = await DiscountCode.findByIdAndDelete(id);

    if (!discount) {
      return res.status(404).json({ message: "Discount code not found." });
    }

    return res.status(200).json({
      message: `Discount code ${discount.code} deleted.`,
    });
  } catch (error) {
    console.error("Delete discount error:", error);
    return res.status(500).json({ message: "Could not delete the discount code." });
  }
};
