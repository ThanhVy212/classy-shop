import CatalogItem, { CATALOG_TYPES } from "../models/CatalogItem.js";
import Product from "../models/Product.js";

export const PRODUCT_FIELD_BY_TYPE = {
  category: "category",
  brand: "brand",
  material: "material",
};

export const normalizeCatalogName = (name) => String(name ?? "").trim();

export const normalizeCatalogKey = (name) =>
  normalizeCatalogName(name).toLowerCase();

const escapeRegExp = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Add missing catalog values without overwriting existing entries.
 * Used after a product is created/updated so the catalog stays in sync.
 */
export const ensureCatalogItems = async (items = []) => {
  const operations = items
    .map(({ type, name }) => ({
      type,
      name: normalizeCatalogName(name),
    }))
    .filter(
      ({ type, name }) =>
        CATALOG_TYPES.includes(type) && name.length > 0,
    )
    .map(({ type, name }) => ({
      updateOne: {
        filter: { type, nameKey: name.toLowerCase() },
        update: {
          $setOnInsert: {
            type,
            name,
            nameKey: name.toLowerCase(),
            isActive: true,
          },
        },
        upsert: true,
      },
    }));

  if (operations.length === 0) return;

  try {
    await CatalogItem.bulkWrite(operations, { ordered: false });
  } catch (error) {
    // Duplicate-key errors can happen when multiple requests insert the same
    // value concurrently. They are harmless because the value already exists.
    if (error?.code !== 11000 && !error?.writeErrors?.every((e) => e?.code === 11000)) {
      throw error;
    }
  }
};

/**
 * Backfill the catalog from products that were created before the catalog
 * existed. Safe to call on every server start.
 */
export const syncCatalogFromProducts = async () => {
  const values = [];

  for (const type of CATALOG_TYPES) {
    const field = PRODUCT_FIELD_BY_TYPE[type];
    const distinctValues = await Product.distinct(field);

    distinctValues.forEach((name) => {
      if (typeof name === "string" && name.trim()) {
        values.push({ type, name });
      }
    });
  }

  await ensureCatalogItems(values);
  return values.length;
};

export const renameCatalogValueInProducts = async (
  type,
  oldName,
  newName,
) => {
  const field = PRODUCT_FIELD_BY_TYPE[type];
  if (!field) return;

  await Product.updateMany(
    {
      [field]: {
        $regex: `^${escapeRegExp(oldName)}$`,
        $options: "i",
      },
    },
    { $set: { [field]: newName } },
  );
};

export const countProductsUsingCatalogValue = async (type, name) => {
  const field = PRODUCT_FIELD_BY_TYPE[type];
  if (!field) return 0;

  return Product.countDocuments({
    [field]: {
      $regex: `^${escapeRegExp(name)}$`,
      $options: "i",
    },
  });
};
