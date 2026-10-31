import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import catalogRoutes from "./routes/catalogRoutes.js";
import { syncCatalogFromProducts } from "./services/catalogService.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8000;

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

// Route
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/catalog", catalogRoutes);

// Connect to MongoDB
connectDB().then(async () => {
  // Backfill catalog values from products created before the catalog existed.
  try {
    await syncCatalogFromProducts();
  } catch (error) {
    console.error("Could not sync product catalog:", error);
  }

  app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
});

export default app;
