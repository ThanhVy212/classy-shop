import mongoose from "mongoose";
import Product from "../models/Product.js";
import InventoryTransaction, {
  INVENTORY_MOVEMENT_TYPES,
} from "../models/InventoryTransaction.js";
import {
  emitAdminStockAlert,
  emitAdminStockUpdated,
} from "../config/socket.js";
import {
  findVariant,
  hasVariants,
  sumVariantStock,
  variantKey,
} from "./variantService.js";

export const DEFAULT_LOW_STOCK_THRESHOLD = 10;
export const MAX_BULK_ITEMS = 500;
export const MAX_CSV_ROWS = 1000;

const INVENTORY_PROJECTION =
  "name sku countInStock variants images category brand updatedAt";

const createHttpError = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

export const getLowStockThreshold = () => {
  const parsed = Number.parseInt(process.env.LOW_STOCK_THRESHOLD, 10);

  return Number.isFinite(parsed) && parsed >= 0
    ? parsed
    : DEFAULT_LOW_STOCK_THRESHOLD;
};

export const normalizeStock = (value) =>
  Math.max(0, Math.floor(Number(value) || 0));

export const getStockStatus = (stock, threshold = getLowStockThreshold()) => {
  const safeStock = normalizeStock(stock);

  if (safeStock <= 0) return "out_of_stock";
  if (safeStock <= threshold) return "low_stock";
  return "in_stock";
};

const normalizeMode = (mode) => {
  const value = String(mode ?? "")
    .trim()
    .toLowerCase();

  if (["increase", "in", "import", "add", "receive"].includes(value)) {
    return "increase";
  }

  if (
    ["decrease", "out", "export", "subtract", "remove", "issue"].includes(
      value,
    )
  ) {
    return "decrease";
  }

  return "set";
};

const getMovementType = (mode, fallbackType) => {
  if (fallbackType) return fallbackType;

  if (mode === "increase") return "import";
  if (mode === "decrease") return "export";
  return "adjustment";
};

const rowFromVariant = (product, variant, threshold, index = 0) => {
  const stock = normalizeStock(variant.stock);
  const variants = Array.isArray(product.variants) ? product.variants : [];

  return {
    rowId: `${product._id}:${variant.size}:${variant.color}:${index}`,
    productId: String(product._id),
    productName: product.name || "Untitled product",
    productSku: String(product.sku || ""),
    sku: String(variant.sku || product.sku || ""),
    variantSku: String(variant.sku || ""),
    size: variant.size || "",
    color: variant.color || "",
    stock,
    threshold,
    status: getStockStatus(stock, threshold),
    image: product.images?.[0]?.url || "",
    category: product.category || "",
    brand: product.brand || "",
    variantCount: variants.length,
    isVariant: true,
    updatedAt: product.updatedAt,
  };
};

const rowFromProduct = (product, threshold) => {
  const stock = normalizeStock(product.countInStock);

  return {
    rowId: `${product._id}:product`,
    productId: String(product._id),
    productName: product.name || "Untitled product",
    productSku: String(product.sku || ""),
    sku: String(product.sku || ""),
    variantSku: "",
    size: "",
    color: "",
    stock,
    threshold,
    status: getStockStatus(stock, threshold),
    image: product.images?.[0]?.url || "",
    category: product.category || "",
    brand: product.brand || "",
    variantCount: 0,
    isVariant: false,
    updatedAt: product.updatedAt,
  };
};

/** Expands products into one inventory row per size/color, or one per product. */
export const buildInventoryRows = (
  products = [],
  threshold = getLowStockThreshold(),
) => {
  const rows = [];

  for (const product of products) {
    if (!product) continue;

    if (hasVariants(product)) {
      for (let index = 0; index < product.variants.length; index += 1) {
        rows.push(
          rowFromVariant(product, product.variants[index], threshold, index),
        );
      }
    } else {
      rows.push(rowFromProduct(product, threshold));
    }
  }

  return rows;
};

const loadInventoryRows = async (threshold = getLowStockThreshold()) => {
  const products = await Product.find({})
    .select(INVENTORY_PROJECTION)
    .lean();

  return {
    products,
    rows: buildInventoryRows(products, threshold),
  };
};

const parsePositiveInt = (value, fallback, max) => {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return max ? Math.min(parsed, max) : parsed;
};

/**
 * Shared status filter. "attention" is the combined low + out of stock view
 * used by the dashboard banner.
 */
const matchesStatusFilter = (row, status) => {
  if (!status || status === "all") return true;
  if (status === "attention") return row.status !== "in_stock";
  return row.status === status;
};

const sortInventoryRows = (rows, sort) => {
  const sorted = [...rows];

  switch (sort) {
    case "stockDesc":
      sorted.sort((a, b) => b.stock - a.stock);
      break;
    case "nameAsc":
      sorted.sort((a, b) =>
        a.productName.localeCompare(b.productName, undefined, {
          sensitivity: "base",
        }),
      );
      break;
    case "nameDesc":
      sorted.sort((a, b) =>
        b.productName.localeCompare(a.productName, undefined, {
          sensitivity: "base",
        }),
      );
      break;
    case "categoryAsc":
      sorted.sort(
        (a, b) =>
          a.category.localeCompare(b.category, undefined, {
            sensitivity: "base",
          }) || a.productName.localeCompare(b.productName),
      );
      break;
    case "updatedDesc":
      sorted.sort(
        (a, b) =>
          new Date(b.updatedAt || 0).getTime() -
          new Date(a.updatedAt || 0).getTime(),
      );
      break;
    case "stockAsc":
    default:
      sorted.sort(
        (a, b) =>
          a.stock - b.stock || a.productName.localeCompare(b.productName),
      );
      break;
  }

  return sorted;
};

/**
 * Inventory table data. The summary is intentionally global (not limited by
 * the current filter) so the stat cards always describe the whole warehouse.
 */
export const listInventory = async ({
  search = "",
  category = "all",
  status = "all",
  sort = "stockAsc",
  page = 1,
  limit = 20,
} = {}) => {
  const threshold = getLowStockThreshold();
  const { products, rows } = await loadInventoryRows(threshold);

  const summary = {
    totalProducts: new Set(rows.map((row) => row.productId)).size,
    totalRows: rows.length,
    totalUnits: rows.reduce((total, row) => total + row.stock, 0),
    lowStockRows: rows.filter((row) => row.status === "low_stock").length,
    outOfStockRows: rows.filter((row) => row.status === "out_of_stock").length,
    threshold,
  };

  const categories = Array.from(
    new Set(products.map((product) => String(product.category || "").trim())),
  )
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  const normalizedSearch = String(search || "").trim().toLowerCase();
  const normalizedCategory = String(category || "all").trim().toLowerCase();
  const normalizedStatus = String(status || "all").trim().toLowerCase();

  let filteredRows = rows.filter((row) => {
    const matchesSearch =
      !normalizedSearch ||
      [
        row.productName,
        row.productSku,
        row.sku,
        row.variantSku,
        row.category,
        row.brand,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);

    const matchesCategory =
      !normalizedCategory ||
      normalizedCategory === "all" ||
      row.category.toLowerCase() === normalizedCategory;

    const matchesStatus = matchesStatusFilter(row, normalizedStatus);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  filteredRows = sortInventoryRows(filteredRows, sort);

  const currentPage = parsePositiveInt(page, 1);
  const pageSize = parsePositiveInt(limit, 20, 200);
  const total = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    rows: filteredRows.slice(start, start + pageSize),
    pagination: {
      total,
      page: safePage,
      limit: pageSize,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPrevPage: safePage > 1,
    },
    summary,
    categories,
    threshold,
  };
};

/** Rows at or below the threshold, most urgent first. */
export const getLowStockAlerts = async ({ limit = 50 } = {}) => {
  const threshold = getLowStockThreshold();
  const { rows } = await loadInventoryRows(threshold);

  const alertRows = rows
    .filter((row) => row.stock <= threshold)
    .sort((a, b) => {
      if ((a.stock === 0) !== (b.stock === 0)) {
        return a.stock === 0 ? -1 : 1;
      }
      return a.stock - b.stock;
    });

  const counts = {
    low: alertRows.filter((row) => row.status === "low_stock").length,
    out: alertRows.filter((row) => row.status === "out_of_stock").length,
    total: alertRows.length,
  };

  return {
    alerts: alertRows.slice(0, parsePositiveInt(limit, 50, 200)),
    counts,
    threshold,
  };
};

const buildStockAlertPayload = ({
  product,
  size = "",
  color = "",
  stock,
  threshold,
  status,
  reason = "",
}) => {
  const variantLabel = [size, color].filter(Boolean).join(" / ");
  const name = product?.name || "A product";
  const title =
    status === "out_of_stock" ? "Out of stock" : "Low stock warning";
  const message =
    status === "out_of_stock"
      ? `${name}${variantLabel ? ` (${variantLabel})` : ""} is now out of stock.`
      : `${name}${variantLabel ? ` (${variantLabel})` : ""} has only ${stock} unit(s) left.`;

  return {
    productId: String(product?._id || ""),
    productName: name,
    productSku: String(product?.sku || ""),
    sku: String(product?.sku || ""),
    size,
    color,
    stock,
    threshold,
    status,
    reason,
    title,
    message,
    at: new Date().toISOString(),
  };
};

const maybeEmitStockAlert = ({
  product,
  size,
  color,
  previousStock,
  newStock,
  threshold,
  reason,
}) => {
  if (!product) return;

  const shouldAlert =
    (previousStock > threshold && newStock <= threshold) ||
    (previousStock > 0 && newStock === 0);

  if (!shouldAlert) return;

  emitAdminStockAlert(
    buildStockAlertPayload({
      product,
      size,
      color,
      stock: newStock,
      threshold,
      status: getStockStatus(newStock, threshold),
      reason,
    }),
  );
};

export const recordInventoryTransaction = async ({
  product,
  size = "",
  color = "",
  sku = "",
  type,
  source = "manual",
  quantity,
  previousStock,
  newStock,
  reason = "",
  note = "",
  reference = "",
  order = null,
  performedBy = null,
  performedByName = "",
}) => {
  if (!product?._id) return null;

  return InventoryTransaction.create({
    product: product._id,
    productName: product.name || "",
    productSku: product.sku || "",
    sku: String(sku || ""),
    size: String(size || ""),
    color: String(color || ""),
    type,
    source,
    quantity: Math.trunc(Number(quantity) || 0),
    previousStock: normalizeStock(previousStock),
    newStock: normalizeStock(newStock),
    reason: String(reason || "").slice(0, 300),
    note: String(note || "").slice(0, 1000),
    reference: String(reference || "").slice(0, 120),
    order,
    performedBy,
    performedByName: String(performedByName || "").slice(0, 120),
  });
};

/**
 * Compares the product's stock before and after a product create/edit and
 * writes the matching history rows. This keeps the history complete when an
 * administrator changes stock from the product form instead of the inventory
 * page.
 */
export const recordProductStockDiff = async ({
  product,
  previousProduct = null,
  performedBy = null,
  performedByName = "",
  reason = "Product details updated",
} = {}) => {
  if (!product?._id) return [];

  const threshold = getLowStockThreshold();
  const newHasVariants = hasVariants(product);
  const oldVariants = Array.isArray(previousProduct?.variants)
    ? previousProduct.variants
    : [];
  const oldHasVariants = oldVariants.length > 0;
  const changes = [];

  if (newHasVariants) {
    const oldVariantMap = new Map(
      oldVariants.map((variant) => [variantKey(variant.size, variant.color), variant]),
    );

    for (const variant of product.variants) {
      const previousVariant = oldVariantMap.get(
        variantKey(variant.size, variant.color),
      );
      const previousStock = previousVariant
        ? normalizeStock(previousVariant.stock)
        : 0;
      const newStock = normalizeStock(variant.stock);

      if (previousStock === newStock) continue;

      changes.push({
        size: variant.size,
        color: variant.color,
        sku: variant.sku || product.sku || "",
        previousStock,
        newStock,
        type: previousVariant ? "adjustment" : "import",
      });
    }

    const newVariantKeys = new Set(
      product.variants.map((variant) => variantKey(variant.size, variant.color)),
    );

    // Variants removed in the form release their remaining units.
    for (const oldVariant of oldVariants) {
      if (newVariantKeys.has(variantKey(oldVariant.size, oldVariant.color))) {
        continue;
      }

      const previousStock = normalizeStock(oldVariant.stock);
      if (previousStock === 0) continue;

      changes.push({
        size: oldVariant.size,
        color: oldVariant.color,
        sku: oldVariant.sku || product.sku || "",
        previousStock,
        newStock: 0,
        type: "export",
        reason: `${reason} — variant removed`,
      });
    }

    // Switching from a product-level count to variants releases the old count.
    if (previousProduct && !oldHasVariants) {
      const previousStock = normalizeStock(previousProduct.countInStock);

      if (previousStock > 0) {
        changes.push({
          size: "",
          color: "",
          sku: product.sku || "",
          previousStock,
          newStock: 0,
          type: "export",
          reason: `${reason} — converted to variants`,
        });
      }
    }
  } else {
    const previousStock = oldHasVariants
      ? oldVariants.reduce(
          (total, variant) => total + normalizeStock(variant.stock),
          0,
        )
      : normalizeStock(previousProduct?.countInStock);
    const newStock = normalizeStock(product.countInStock);

    if (previousStock !== newStock) {
      changes.push({
        size: "",
        color: "",
        sku: product.sku || "",
        previousStock,
        newStock,
        type: previousProduct ? "adjustment" : "import",
      });
    }
  }

  const movements = [];

  for (const change of changes) {
    try {
      const movement = await recordInventoryTransaction({
        product,
        size: change.size,
        color: change.color,
        sku: change.sku,
        type: change.type,
        source: "manual",
        quantity: change.newStock - change.previousStock,
        previousStock: change.previousStock,
        newStock: change.newStock,
        reason: change.reason || reason,
        performedBy,
        performedByName,
      });

      movements.push(movement);

      if (
        (change.previousStock > threshold && change.newStock <= threshold) ||
        (change.previousStock > 0 && change.newStock === 0)
      ) {
        emitAdminStockAlert(
          buildStockAlertPayload({
            product,
            size: change.size,
            color: change.color,
            stock: change.newStock,
            threshold,
            status: getStockStatus(change.newStock, threshold),
            reason,
          }),
        );
      }
    } catch (error) {
      console.error("Could not record product stock change:", error);
    }
  }

  if (movements.length > 0) {
    emitAdminStockUpdated({
      productId: String(product._id),
      productName: product.name || "",
      source: "product",
      reason,
    });
  }

  return movements;
};

/**
 * Applies a stock change to one product row (a variant or the product-level
 * count) and records the matching history entry.
 *
 * mode:
 * - "set": value is the new absolute stock.
 * - "increase": value is added to the current stock.
 * - "decrease": value is removed from the current stock.
 */
export const applyStockChange = async ({
  product,
  size = "",
  color = "",
  mode = "set",
  value = 0,
  type,
  reason = "",
  note = "",
  source = "manual",
  reference = "",
  order = null,
  performedBy = null,
  performedByName = "",
  threshold = getLowStockThreshold(),
  emitEvents = true,
} = {}) => {
  if (!product?._id) {
    throw createHttpError("Product not found.", 404);
  }

  const normalizedMode = normalizeMode(mode);
  const numericValue = Number(value);
  const requestedValue = numericValue;

  if (
    !Number.isFinite(numericValue) ||
    !Number.isInteger(numericValue) ||
    numericValue < 0
  ) {
    throw createHttpError("Stock must be a non-negative whole number.");
  }

  if (normalizedMode !== "set" && requestedValue < 1) {
    throw createHttpError(
      "The quantity to add or remove must be at least 1.",
    );
  }

  const productHasVariants = hasVariants(product);
  const variant = productHasVariants ? findVariant(product, size, color) : null;

  if (productHasVariants && !variant) {
    throw createHttpError(
      `No variant found for "${size || "—"} / ${color || "—"}".`,
    );
  }

  let previousStock;
  let newStock;
  let updatedProduct = product;

  if (productHasVariants) {
    previousStock = normalizeStock(variant.stock);

    if (normalizedMode === "set") {
      if (requestedValue === previousStock) {
        return {
          skipped: true,
          productId: String(product._id),
          sku: variant.sku || product.sku || "",
          size: variant.size,
          color: variant.color,
          previousStock,
          newStock: previousStock,
          status: getStockStatus(previousStock, threshold),
          threshold,
        };
      }

      const result = await Product.updateOne(
        {
          _id: product._id,
          variants: {
            $elemMatch: { size: variant.size, color: variant.color },
          },
        },
        { $set: { "variants.$.stock": requestedValue } },
      );

      if (!result.modifiedCount) {
        throw createHttpError(
          "This variant could not be updated. Refresh and try again.",
          409,
        );
      }

      updatedProduct = await Product.findById(product._id)
        .select(INVENTORY_PROJECTION)
        .lean();

      if (!updatedProduct) {
        throw createHttpError("Product not found.", 404);
      }

      newStock = requestedValue;
      const nextTotal = sumVariantStock(updatedProduct.variants);
      await Product.updateOne(
        { _id: product._id },
        { $set: { countInStock: nextTotal } },
      );
      updatedProduct.countInStock = nextTotal;
    } else {
      const delta =
        normalizedMode === "increase" ? requestedValue : -requestedValue;
      const filter = {
        _id: product._id,
        variants: {
          $elemMatch: {
            size: variant.size,
            color: variant.color,
            ...(delta < 0 ? { stock: { $gte: requestedValue } } : {}),
          },
        },
      };

      const updated = await Product.findOneAndUpdate(
        filter,
        {
          $inc: {
            "variants.$.stock": delta,
            countInStock: delta,
          },
        },
        { new: true, projection: INVENTORY_PROJECTION },
      );

      if (!updated) {
        throw createHttpError(
          `Only ${previousStock} unit(s) of this variant are available; cannot remove ${requestedValue}.`,
          409,
        );
      }

      updatedProduct = updated;
      const updatedVariant = findVariant(updated, variant.size, variant.color);
      newStock = normalizeStock(updatedVariant?.stock);
    }
  } else {
    previousStock = normalizeStock(product.countInStock);

    if (normalizedMode === "set") {
      if (requestedValue === previousStock) {
        return {
          skipped: true,
          productId: String(product._id),
          sku: product.sku || "",
          size: "",
          color: "",
          previousStock,
          newStock: previousStock,
          status: getStockStatus(previousStock, threshold),
          threshold,
        };
      }

      newStock = requestedValue;
      updatedProduct = await Product.findOneAndUpdate(
        { _id: product._id },
        { $set: { countInStock: newStock } },
        { new: true, projection: INVENTORY_PROJECTION },
      );

      if (!updatedProduct) {
        throw createHttpError("Product not found.", 404);
      }
    } else {
      const delta =
        normalizedMode === "increase" ? requestedValue : -requestedValue;
      const filter = {
        _id: product._id,
        ...(delta < 0 ? { countInStock: { $gte: requestedValue } } : {}),
      };

      updatedProduct = await Product.findOneAndUpdate(
        filter,
        { $inc: { countInStock: delta } },
        { new: true, projection: INVENTORY_PROJECTION },
      );

      if (!updatedProduct) {
        throw createHttpError(
          `Only ${previousStock} unit(s) are available; cannot remove ${requestedValue}.`,
          409,
        );
      }

      newStock = normalizeStock(updatedProduct.countInStock);
    }
  }

  const movement = await recordInventoryTransaction({
    product,
    size: variant?.size ?? "",
    color: variant?.color ?? "",
    sku: variant?.sku || product.sku || "",
    type: getMovementType(normalizedMode, type),
    source,
    quantity: newStock - previousStock,
    previousStock,
    newStock,
    reason,
    note,
    reference,
    order,
    performedBy,
    performedByName,
  });

  if (emitEvents) {
    emitAdminStockUpdated({
      productId: String(product._id),
      productName: product.name || "",
      sku: variant?.sku || product.sku || "",
      size: variant?.size ?? "",
      color: variant?.color ?? "",
      stock: newStock,
      previousStock,
      status: getStockStatus(newStock, threshold),
      source,
    });

    maybeEmitStockAlert({
      product,
      size: variant?.size ?? "",
      color: variant?.color ?? "",
      previousStock,
      newStock,
      threshold,
      reason: reason || type || "Stock update",
    });
  }

  return {
    skipped: false,
    movement,
    productId: String(product._id),
    sku: variant?.sku || product.sku || "",
    size: variant?.size ?? "",
    color: variant?.color ?? "",
    previousStock,
    newStock,
    status: getStockStatus(newStock, threshold),
    threshold,
  };
};

/**
 * Writes movement rows for an order's items.
 *
 * type "order_out" is called after stock was reserved, so the product already
 * holds the post-sale count. type "order_return" is called after a cancelled
 * order restored stock. Both together give a complete in/out history.
 */
export const recordOrderStockMovements = async ({
  order,
  items = [],
  type = "order_out",
  performedByName = "",
}) => {
  if (!order?._id || !Array.isArray(items) || items.length === 0) return [];

  const threshold = getLowStockThreshold();

  try {
    const productIds = Array.from(
      new Set(items.map((item) => String(item.productId))),
    ).filter((id) => mongoose.isValidObjectId(id));

    const products = await Product.find({ _id: { $in: productIds } })
      .select(INVENTORY_PROJECTION)
      .lean();
    const productMap = new Map(
      products.map((product) => [String(product._id), product]),
    );

    const movements = [];
    const alertPayloads = [];
    const groupedItems = [];
    const itemMap = new Map();

    // Merge duplicate order lines for the same product/variant so the history
    // shows one accurate movement instead of two overlapping rows.
    for (const item of items) {
      const key = `${item.productId}::${item.size || ""}::${item.color || ""}`;
      const existing = itemMap.get(key);

      if (existing) {
        existing.quantity += Math.abs(Number(item.quantity) || 0);
      } else {
        const grouped = {
          productId: item.productId,
          size: item.size || "",
          color: item.color || "",
          quantity: Math.abs(Number(item.quantity) || 0),
        };
        itemMap.set(key, grouped);
        groupedItems.push(grouped);
      }
    }

    for (const item of groupedItems) {
      const product = productMap.get(String(item.productId));
      if (!product) continue;

      const quantity = Math.abs(Math.floor(Number(item.quantity) || 0));
      if (!quantity) continue;

      const variant = hasVariants(product)
        ? findVariant(product, item.size, item.color)
        : null;
      const currentStock = variant
        ? normalizeStock(variant.stock)
        : normalizeStock(product.countInStock);
      const previousStock =
        type === "order_out"
          ? currentStock + quantity
          : Math.max(0, currentStock - quantity);
      const newStock = currentStock;

      movements.push({
        product: product._id,
        productName: product.name || "",
        productSku: product.sku || "",
        sku: variant?.sku || product.sku || "",
        size: variant?.size || item.size || "",
        color: variant?.color || item.color || "",
        type,
        source: "order",
        quantity: type === "order_out" ? -quantity : quantity,
        previousStock,
        newStock,
        reason:
          type === "order_out"
            ? `Order ${order.orderNumber || ""} placed`
            : `Order ${order.orderNumber || ""} cancelled`,
        note: "",
        reference: order.orderNumber || "",
        order: order._id,
        performedBy: order.user?._id || order.user || null,
        performedByName:
          performedByName ||
          order.shippingAddress?.fullName ||
          order.contactEmail ||
          "",
      });

      if (type === "order_out") {
        const shouldAlert =
          (previousStock > threshold && newStock <= threshold) ||
          (previousStock > 0 && newStock === 0);

        if (shouldAlert) {
          alertPayloads.push(
            buildStockAlertPayload({
              product,
              size: variant?.size || item.size || "",
              color: variant?.color || item.color || "",
              stock: newStock,
              threshold,
              status: getStockStatus(newStock, threshold),
              reason: `Sold on order ${order.orderNumber || ""}`,
            }),
          );
        }
      }
    }

    if (movements.length > 0) {
      await InventoryTransaction.insertMany(movements, { ordered: false });
    }

    alertPayloads.forEach((alert) => emitAdminStockAlert(alert));

    if (movements.length > 0) {
      emitAdminStockUpdated({
        productIds: Array.from(
          new Set(movements.map((movement) => String(movement.product))),
        ),
        source: "order",
        orderNumber: order.orderNumber || "",
        type,
      });
    }

    return movements;
  } catch (error) {
    // Order flow must never fail because inventory history failed to write.
    console.error("Could not record order stock movements:", error);
    return [];
  }
};

export const listInventoryHistory = async ({
  page = 1,
  limit = 20,
  type = "all",
  productId = "",
  search = "",
  from = "",
  to = "",
} = {}) => {
  const filter = {};

  if (type && type !== "all" && INVENTORY_MOVEMENT_TYPES.includes(type)) {
    filter.type = type;
  }

  if (productId && mongoose.isValidObjectId(productId)) {
    filter.product = productId;
  }

  if (from || to) {
    filter.createdAt = {};

    if (from) {
      const start = new Date(from);
      if (!Number.isNaN(start.getTime())) {
        start.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = start;
      }
    }

    if (to) {
      const end = new Date(to);
      if (!Number.isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (Object.keys(filter.createdAt).length === 0) {
      delete filter.createdAt;
    }
  }

  const normalizedSearch = String(search || "").trim();
  if (normalizedSearch) {
    const regex = new RegExp(
      normalizedSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );

    filter.$or = [
      { productName: regex },
      { productSku: regex },
      { sku: regex },
      { reference: regex },
      { reason: regex },
      { performedByName: regex },
    ];
  }

  const currentPage = parsePositiveInt(page, 1);
  const pageSize = parsePositiveInt(limit, 20, 100);

  const [entries, total] = await Promise.all([
    InventoryTransaction.find(filter)
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    InventoryTransaction.countDocuments(filter),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    entries,
    total,
    page: Math.min(currentPage, totalPages),
    pages: totalPages,
    limit: pageSize,
  };
};

export const bulkUpdateStock = async ({
  items,
  mode = "set",
  reason = "",
  note = "",
  performedBy = null,
  performedByName = "",
} = {}) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw createHttpError("Select at least one inventory row to update.");
  }

  if (items.length > MAX_BULK_ITEMS) {
    throw createHttpError(
      `A bulk update can change at most ${MAX_BULK_ITEMS} rows at once.`,
    );
  }

  const productIds = Array.from(
    new Set(
      items
        .map((item) => String(item?.productId || ""))
        .filter((id) => mongoose.isValidObjectId(id)),
    ),
  );

  const products = await Product.find({ _id: { $in: productIds } }).select(
    INVENTORY_PROJECTION,
  );
  const productMap = new Map(
    products.map((product) => [String(product._id), product]),
  );

  const results = [];
  const errors = [];
  let updated = 0;
  let skipped = 0;

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index] || {};
    const product = productMap.get(String(item.productId || ""));

    try {
      if (!product) {
        throw createHttpError("Product not found.", 404);
      }

      const result = await applyStockChange({
        product,
        size: item.size,
        color: item.color,
        mode: item.mode || mode,
        value: item.value ?? item.stock ?? item.quantity,
        type: "bulk_update",
        reason:
          item.reason ||
          reason ||
          "Bulk inventory update",
        note,
        source: "bulk",
        performedBy,
        performedByName,
      });

      if (result.skipped) {
        skipped += 1;
      } else {
        updated += 1;

        // Keep the in-memory product in sync so a second row for the same
        // variant records the correct previous/after values.
        if (hasVariants(product)) {
          const variant = findVariant(product, item.size, item.color);
          if (variant) variant.stock = result.newStock;
        } else {
          product.countInStock = result.newStock;
        }
      }

      results.push({ row: index + 1, ...result });
    } catch (error) {
      errors.push({
        row: index + 1,
        productId: String(item.productId || ""),
        message: error.message,
      });
    }
  }

  const lowStock = await getLowStockAlerts({ limit: 10 });

  return {
    updated,
    skipped,
    failed: errors.length,
    total: items.length,
    results,
    errors,
    lowStock,
    threshold: getLowStockThreshold(),
  };
};

/** Small RFC 4180-ish CSV parser (quoted fields, escaped quotes, CRLF). */
export const parseCsv = (input) => {
  const text = String(input ?? "").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (inQuotes) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      inQuotes = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (character !== "\r") {
      field += character;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((cells) =>
    cells.some((cell) => String(cell).trim() !== ""),
  );
};

const normalizeHeader = (value) =>
  String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const getCsvValue = (cells, headerIndex, names) => {
  for (const name of names) {
    const index = headerIndex.get(name);
    if (index === undefined) continue;

    const value = String(cells[index] ?? "").trim();
    if (value !== "") return value;
  }

  return "";
};

const generateBatchId = () =>
  `CSV-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;

export const importInventoryCsv = async ({
  csvText,
  reason = "",
  note = "",
  performedBy = null,
  performedByName = "",
} = {}) => {
  const text = String(csvText ?? "").trim();
  if (!text) {
    throw createHttpError("The CSV file is empty.");
  }

  const rows = parseCsv(text);
  if (rows.length < 2) {
    throw createHttpError(
      "The CSV must contain a header row and at least one data row.",
    );
  }

  const headerIndex = new Map();
  rows[0].forEach((header, index) => {
    const key = normalizeHeader(header);
    if (key && !headerIndex.has(key)) headerIndex.set(key, index);
  });

  const hasProductColumn = ["productid", "productsku", "sku"].some((header) =>
    headerIndex.has(header),
  );

  if (!hasProductColumn) {
    throw createHttpError(
      "The CSV needs a productId, productSku or sku column.",
    );
  }

  if (!headerIndex.has("stock") && !headerIndex.has("quantity") && !headerIndex.has("qty")) {
    throw createHttpError("The CSV needs a stock or quantity column.");
  }

  const dataRows = rows.slice(1).filter((cells) =>
    cells.some((cell) => String(cell).trim() !== ""),
  );

  if (dataRows.length > MAX_CSV_ROWS) {
    throw createHttpError(
      `A CSV import can contain at most ${MAX_CSV_ROWS} data rows.`,
    );
  }

  const parsedRows = dataRows.map((cells, index) => ({
    line: index + 2,
    productId: getCsvValue(cells, headerIndex, ["productid"]),
    productSku: getCsvValue(cells, headerIndex, ["productsku"]),
    sku: getCsvValue(cells, headerIndex, ["sku"]),
    size: getCsvValue(cells, headerIndex, ["size"]),
    color: getCsvValue(cells, headerIndex, ["color"]),
    stock: getCsvValue(cells, headerIndex, ["stock", "quantity", "qty"]),
    mode: getCsvValue(cells, headerIndex, ["mode", "operation", "action"]),
    reason: getCsvValue(cells, headerIndex, ["reason", "note"]),
  }));

  const productIds = Array.from(
    new Set(
      parsedRows
        .map((row) => row.productId)
        .filter((id) => mongoose.isValidObjectId(id)),
    ),
  );
  const skus = Array.from(
    new Set(
      parsedRows
        .flatMap((row) => [row.productSku, row.sku])
        .map((sku) => String(sku || "").trim())
        .filter(Boolean),
    ),
  );

  const queryParts = [];
  if (productIds.length > 0) queryParts.push({ _id: { $in: productIds } });
  if (skus.length > 0) {
    queryParts.push({ sku: { $in: skus } });
    queryParts.push({ "variants.sku": { $in: skus } });
  }

  const products = queryParts.length
    ? await Product.find({ $or: queryParts }).select(INVENTORY_PROJECTION)
    : [];

  const productsById = new Map(
    products.map((product) => [String(product._id), product]),
  );
  const productsBySku = new Map();
  const productsByVariantSku = new Map();

  for (const product of products) {
    if (product.sku) productsBySku.set(String(product.sku), product);
    if (hasVariants(product)) {
      for (const variant of product.variants) {
        if (variant.sku) {
          productsByVariantSku.set(String(variant.sku), {
            product,
            variant,
          });
        }
      }
    }
  }

  const batchId = generateBatchId();
  const errors = [];
  const updatedResults = [];
  let updated = 0;
  let skipped = 0;

  for (const row of parsedRows) {
    try {
      let product = row.productId
        ? productsById.get(row.productId)
        : undefined;

      if (!product && row.productSku) {
        product = productsBySku.get(row.productSku);
      }

      let variantHint = null;
      if (!product && row.sku) {
        product = productsBySku.get(row.sku);
      }
      if (row.sku) {
        variantHint = productsByVariantSku.get(row.sku) || null;
        if (!product && variantHint) product = variantHint.product;
      }

      if (!product) {
        throw createHttpError(
          `No product found for ${row.productId || row.productSku || row.sku || "this row"}.`,
          404,
        );
      }

      let size = row.size;
      let color = row.color;

      if (hasVariants(product)) {
        let variant = size && color ? findVariant(product, size, color) : null;

        if (!variant && variantHint?.product?._id &&
          String(variantHint.product._id) === String(product._id)) {
          variant = variantHint.variant;
        }

        if (!variant) {
          throw createHttpError(
            `Size and color are required for "${product.name}" (or use a variant SKU).`,
          );
        }

        size = variant.size;
        color = variant.color;
      } else {
        size = "";
        color = "";
      }

      const parsedStock = Number(row.stock);
      if (!Number.isInteger(parsedStock) || parsedStock < 0) {
        throw createHttpError("Stock must be a non-negative whole number.");
      }

      const result = await applyStockChange({
        product,
        size,
        color,
        mode: row.mode || "set",
        value: parsedStock,
        type: "csv_import",
        reason: row.reason || reason || "CSV stock import",
        note,
        source: "csv",
        reference: batchId,
        performedBy,
        performedByName,
      });

      if (result.skipped) {
        skipped += 1;
      } else {
        updated += 1;

        // Keep the in-memory product in sync so later rows that target the
        // same variant report the correct previous stock.
        if (hasVariants(product)) {
          const variant = findVariant(product, size, color);
          if (variant) variant.stock = result.newStock;
        } else {
          product.countInStock = result.newStock;
        }
      }

      updatedResults.push({ line: row.line, ...result });
    } catch (error) {
      errors.push({
        line: row.line,
        sku: row.sku || row.productSku || row.productId || "",
        size: row.size,
        color: row.color,
        message: error.message,
      });
    }
  }

  const lowStock = await getLowStockAlerts({ limit: 10 });

  return {
    batchId,
    totalRows: dataRows.length,
    updated,
    skipped,
    failed: errors.length,
    errors,
    results: updatedResults,
    lowStock,
    threshold: getLowStockThreshold(),
  };
};

const escapeCsv = (value) => {
  const text = String(value ?? "");

  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const inventoryRowsToCsv = (rows) => {
  const header = [
    "productId",
    "productSku",
    "sku",
    "productName",
    "size",
    "color",
    "stock",
    "threshold",
    "status",
    "category",
  ];

  const lines = [header.join(",")];

  for (const row of rows) {
    lines.push(
      [
        row.productId,
        row.productSku,
        row.sku,
        row.productName,
        row.size,
        row.color,
        row.stock,
        row.threshold,
        row.status,
        row.category,
      ]
        .map(escapeCsv)
        .join(","),
    );
  }

  // BOM keeps Vietnamese product names readable when opened in Excel.
  return `\uFEFF${lines.join("\r\n")}\r\n`;
};

export const exportInventoryCsv = async (filters = {}) => {
  const threshold = getLowStockThreshold();
  const { rows } = await loadInventoryRows(threshold);
  const normalizedSearch = String(filters.search || "").trim().toLowerCase();
  const normalizedCategory = String(filters.category || "all")
    .trim()
    .toLowerCase();
  const normalizedStatus = String(filters.status || "all")
    .trim()
    .toLowerCase();

  const filteredRows = rows.filter((row) => {
    const matchesSearch =
      !normalizedSearch ||
      [
        row.productName,
        row.productSku,
        row.sku,
        row.variantSku,
        row.category,
        row.brand,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    const matchesCategory =
      !normalizedCategory ||
      normalizedCategory === "all" ||
      row.category.toLowerCase() === normalizedCategory;
    const matchesStatus = matchesStatusFilter(row, normalizedStatus);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return {
    csv: inventoryRowsToCsv(
      sortInventoryRows(filteredRows, filters.sort || "stockAsc"),
    ),
    count: filteredRows.length,
  };
};

export const buildInventoryTemplateCsv = async () => {
  const threshold = getLowStockThreshold();
  const { rows } = await loadInventoryRows(threshold);
  const header = [
    "productId",
    "productSku",
    "sku",
    "size",
    "color",
    "stock",
    "mode",
    "reason",
  ];

  const lines = [header.join(",")];

  for (const row of rows.slice(0, 100)) {
    lines.push(
      [
        row.productId,
        row.productSku,
        row.variantSku || "",
        row.size,
        row.color,
        row.stock,
        "set",
        "Stock take",
      ]
        .map(escapeCsv)
        .join(","),
    );
  }

  return `\uFEFF${lines.join("\r\n")}\r\n`;
};
