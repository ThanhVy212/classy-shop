// Must stay the first import: it loads .env before the other modules read
// process.env (rate limiting config, JWT secrets, ...).
import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import catalogRoutes from "./routes/catalogRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import adminOrderRoutes from "./routes/adminOrderRoutes.js";
import adminNotificationRoutes from "./routes/adminNotificationRoutes.js";
import adminDashboardRoutes from "./routes/adminDashboardRoutes.js";
import discountRoutes from "./routes/discountRoutes.js";
import adminDiscountRoutes from "./routes/adminDiscountRoutes.js";
import {
  apiRateLimit,
  writeRateLimit,
} from "./middlewares/rateLimitMiddleware.js";
import { syncCatalogFromProducts } from "./services/catalogService.js";
import { ensureDefaultDiscountCodes } from "./services/discountService.js";
import { initSocket } from "./config/socket.js";

const app = express();
const PORT = process.env.PORT || 8000;

// Needed so req.ip is the real client address when running behind a proxy.
// TRUST_PROXY accepts a hop count ("1", "2") or a comma-separated list of
// proxy subnets ("127.0.0.1/8,10.0.0.0/8"). "true" is rejected because it
// would trust any client-supplied X-Forwarded-For value.
const trustProxy = process.env.TRUST_PROXY?.trim();

if (trustProxy && trustProxy.toLowerCase() !== "false") {
  if (trustProxy.toLowerCase() === "true") {
    throw new Error(
      'TRUST_PROXY="true" is not supported because it allows clients to spoof ' +
        'X-Forwarded-For. Use a hop count (e.g. "1") or a proxy subnet list ' +
        '(e.g. "127.0.0.1/8,10.0.0.0/8") instead.',
    );
  }

  app.set(
    "trust proxy",
    /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy,
  );
}

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

// Rate limit every API call, with a stricter quota for mutations.
app.use("/api", apiRateLimit);
app.use("/api", writeRateLimit);

// Route
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/catalog", catalogRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin/orders", adminOrderRoutes);
app.use("/api/admin/notifications", adminNotificationRoutes);
app.use("/api/admin/dashboard", adminDashboardRoutes);
app.use("/api/discounts", discountRoutes);
app.use("/api/admin/discounts", adminDiscountRoutes);

// Connect to MongoDB
connectDB().then(async () => {
  // Backfill catalog values from products created before the catalog existed.
  try {
    await syncCatalogFromProducts();
  } catch (error) {
    console.error("Could not sync product catalog:", error);
  }

  // Keep the original storefront promo codes available on a fresh database.
  try {
    await ensureDefaultDiscountCodes();
  } catch (error) {
    console.error("Could not initialize discount codes:", error);
  }

  const httpServer = app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });

  initSocket(httpServer);
});

export default app;
