import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "./models/Product.js";
import User from "./models/User.js";
import { products } from "./data/products.js";

dotenv.config();

// Connect to mongoDB
mongoose.connect(process.env.MONGODB_URI);

const seedData = async () => {
  try {
    await Product.deleteMany();

    const createdUser = await User.create({
      name: "Admin User",
      email: "admin@example.com",
      password: "123456",
      role: "admin",
    });

    const userId = createdUser._id;

    const sampleProducts = products.map((product) => {
      return { ...product, user: userId };
    });

    await Product.insertMany(sampleProducts);

    console.log("Product data seeded successfully!");
    process.exit();
  } catch (e) {
    console.log("error seeding the data: ", e);
    process.exit(1);
  }
};

seedData();
