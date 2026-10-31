import CatalogItem, { CATALOG_TYPES } from "../models/CatalogItem.js";
import {
  countProductsUsingCatalogValue,
  normalizeCatalogKey,
  normalizeCatalogName,
  renameCatalogValueInProducts,
} from "../services/catalogService.js";

const validateType = (type) => CATALOG_TYPES.includes(type);

export const getCatalogItems = async (req, res) => {
  try {
    const { type } = req.query;

    if (type !== undefined && !validateType(type)) {
      return res.status(400).json({
        message: `Invalid catalog type. Expected one of: ${CATALOG_TYPES.join(", ")}`,
      });
    }

    const query = type ? { type } : {};
    const items = await CatalogItem.find(query)
      .sort({ type: 1, name: 1 })
      .select("-__v")
      .lean();

    return res.status(200).json({ items });
  } catch (error) {
    console.error("Get catalog items error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const createCatalogItem = async (req, res) => {
  try {
    const { type, name, description } = req.body;
    const normalizedName = normalizeCatalogName(name);

    if (!validateType(type)) {
      return res.status(400).json({
        message: `Invalid catalog type. Expected one of: ${CATALOG_TYPES.join(", ")}`,
      });
    }

    if (!normalizedName) {
      return res.status(400).json({ message: "Name is required" });
    }

    const nameKey = normalizeCatalogKey(normalizedName);
    const existing = await CatalogItem.findOne({ type, nameKey });

    if (existing) {
      return res.status(409).json({
        message: `${type} "${normalizedName}" already exists`,
        item: existing,
      });
    }

    const item = await CatalogItem.create({
      type,
      name: normalizedName,
      description: description?.trim() || undefined,
    });

    return res.status(201).json({ item });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "This catalog value already exists" });
    }

    console.error("Create catalog item error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const updateCatalogItem = async (req, res) => {
  try {
    const { name, description, isActive } = req.body;
    const item = await CatalogItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: "Catalog item not found" });
    }

    if (name !== undefined) {
      const normalizedName = normalizeCatalogName(name);

      if (!normalizedName) {
        return res.status(400).json({ message: "Name is required" });
      }

      const nameKey = normalizeCatalogKey(normalizedName);
      const isChangingName = nameKey !== item.nameKey;
      const duplicate = isChangingName
        ? await CatalogItem.findOne({
            _id: { $ne: item._id },
            type: item.type,
            nameKey,
          })
        : null;

      if (duplicate) {
        return res.status(409).json({
          message: `${item.type} "${normalizedName}" already exists`,
        });
      }

      if (isChangingName) {
        // Keep existing products in sync when an admin renames a catalog value.
        await renameCatalogValueInProducts(item.type, item.name, normalizedName);
      }

      item.name = normalizedName;
    }

    if (description !== undefined) {
      item.description = description.trim() || undefined;
    }

    if (isActive !== undefined) {
      item.isActive = Boolean(isActive);
    }

    await item.save();

    return res.status(200).json({ item });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "This catalog value already exists" });
    }

    console.error("Update catalog item error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const deleteCatalogItem = async (req, res) => {
  try {
    const item = await CatalogItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: "Catalog item not found" });
    }

    const usageCount = await countProductsUsingCatalogValue(item.type, item.name);

    if (usageCount > 0) {
      return res.status(400).json({
        message: `Cannot delete "${item.name}" because it is used by ${usageCount} product(s). Reassign those products first.`,
      });
    }

    await item.deleteOne();

    return res.status(200).json({ message: "Catalog item removed" });
  } catch (error) {
    console.error("Delete catalog item error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
