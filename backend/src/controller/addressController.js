import mongoose from "mongoose";
import User from "../models/User.js";

const MAX_ADDRESSES = 20;

const ADDRESS_FIELDS = [
  "label",
  "fullName",
  "phone",
  "address",
  "apartment",
  "city",
  "postalCode",
  "country",
];

const REQUIRED_FIELDS = [
  "fullName",
  "phone",
  "address",
  "city",
  "postalCode",
  "country",
];

const FIELD_LIMITS = {
  label: 40,
  fullName: 120,
  phone: 30,
  address: 160,
  apartment: 120,
  city: 80,
  postalCode: 20,
  country: 80,
};

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

/**
 * Pick only the fields a customer is allowed to write and normalise them.
 * Unknown keys are ignored so the client cannot touch isDefault or _id here.
 */
const readAddressFields = (body = {}) => {
  const fields = {};

  for (const field of ADDRESS_FIELDS) {
    if (body[field] !== undefined) {
      fields[field] = normalizeText(body[field]);
    }
  }

  return fields;
};

const validateAddress = (fields) => {
  const missing = REQUIRED_FIELDS.filter((field) => !fields[field]);

  if (missing.length > 0) {
    return "Please fill in all required address fields.";
  }

  const tooLong = ADDRESS_FIELDS.find(
    (field) =>
      FIELD_LIMITS[field] &&
      typeof fields[field] === "string" &&
      fields[field].length > FIELD_LIMITS[field],
  );

  if (tooLong) {
    return "One of the address fields is too long.";
  }

  return null;
};

const ensureDefaultAddress = (user) => {
  if (user.addresses.length === 0) return;

  if (user.addresses.some((address) => address.isDefault)) return;

  user.addresses[0].isDefault = true;
};

const clearOtherDefaults = (user, keepId) => {
  for (const address of user.addresses) {
    if (String(address._id) !== String(keepId)) {
      address.isDefault = false;
    }
  }
};

const serializeAddresses = (user) =>
  (user.addresses ?? []).map((address) => address.toObject());

const respondWithAddresses = (res, status, message, user) =>
  res.status(status).json({
    message,
    addresses: serializeAddresses(user),
  });

/**
 * GET /api/auth/addresses
 * Returns the signed-in customer's saved delivery addresses.
 */
export const getAddresses = async (req, res) => {
  try {
    return respondWithAddresses(
      res,
      200,
      "Addresses loaded",
      req.user,
    );
  } catch (error) {
    console.error("Get addresses error:", error);
    return res.status(500).json({ message: "Could not load your addresses." });
  }
};

/**
 * POST /api/auth/addresses
 * Saves a new delivery address. The first address, or one explicitly marked
 * as default, becomes the default for future checkouts.
 */
export const createAddress = async (req, res) => {
  try {
    const fields = readAddressFields(req.body);
    const validationError = validateAddress(fields);

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.addresses.length >= MAX_ADDRESSES) {
      return res.status(400).json({
        message: `You can save up to ${MAX_ADDRESSES} addresses.`,
      });
    }

    const makeDefault =
      req.body?.isDefault === true || user.addresses.length === 0;

    if (makeDefault) {
      clearOtherDefaults(user, null);
    }

    user.addresses.push({ ...fields, isDefault: makeDefault });
    ensureDefaultAddress(user);
    await user.save();

    return respondWithAddresses(
      res,
      201,
      "Address saved",
      user,
    );
  } catch (error) {
    console.error("Create address error:", error);
    return res.status(500).json({ message: "Could not save this address." });
  }
};

/**
 * PATCH /api/auth/addresses/:addressId
 * Updates a saved address. Passing isDefault promotes it to the default.
 */
export const updateAddress = async (req, res) => {
  try {
    const { addressId } = req.params;

    if (!mongoose.isValidObjectId(addressId)) {
      return res.status(400).json({ message: "Invalid address." });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const address = user.addresses.id(addressId);

    if (!address) {
      return res.status(404).json({ message: "Address not found." });
    }

    const fields = readAddressFields(req.body);
    Object.assign(address, fields);

    const validationError = validateAddress({
      fullName: address.fullName,
      phone: address.phone,
      address: address.address,
      apartment: address.apartment,
      city: address.city,
      postalCode: address.postalCode,
      country: address.country,
    });

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    if (req.body?.isDefault === true) {
      clearOtherDefaults(user, address._id);
      address.isDefault = true;
    }

    ensureDefaultAddress(user);
    await user.save();

    return respondWithAddresses(
      res,
      200,
      "Address updated",
      user,
    );
  } catch (error) {
    console.error("Update address error:", error);
    return res.status(500).json({ message: "Could not update this address." });
  }
};

/**
 * PATCH /api/auth/addresses/:addressId/default
 * Marks one saved address as the default delivery address.
 */
export const setDefaultAddress = async (req, res) => {
  try {
    const { addressId } = req.params;

    if (!mongoose.isValidObjectId(addressId)) {
      return res.status(400).json({ message: "Invalid address." });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const address = user.addresses.id(addressId);

    if (!address) {
      return res.status(404).json({ message: "Address not found." });
    }

    clearOtherDefaults(user, address._id);
    address.isDefault = true;
    await user.save();

    return respondWithAddresses(
      res,
      200,
      "Default address updated",
      user,
    );
  } catch (error) {
    console.error("Set default address error:", error);
    return res
      .status(500)
      .json({ message: "Could not update your default address." });
  }
};

/**
 * DELETE /api/auth/addresses/:addressId
 * Removes a saved address. If it was the default, the next one is promoted.
 */
export const deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;

    if (!mongoose.isValidObjectId(addressId)) {
      return res.status(400).json({ message: "Invalid address." });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const address = user.addresses.id(addressId);

    if (!address) {
      return res.status(404).json({ message: "Address not found." });
    }

    address.deleteOne();
    ensureDefaultAddress(user);
    await user.save();

    return respondWithAddresses(
      res,
      200,
      "Address removed",
      user,
    );
  } catch (error) {
    console.error("Delete address error:", error);
    return res.status(500).json({ message: "Could not remove this address." });
  }
};
