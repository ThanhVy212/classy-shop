import jwt from "jsonwebtoken";
import User from "../models/User.js";

// authorization
export const protectedRoute = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Access token not found" });
    }

    jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET,
      async (err, decodedUser) => {
        if (err) {
          console.log(err);
          return res
            .status(403)
            .json({ message: "Access token is invalid or expired" });
        }

        const user = await User.findById(decodedUser.userId).select(
          "-passwordHash",
        );

        if (!user) {
          return res.status(404).json({ message: "User doest not exist" });
        }

        req.user = user;
        next();
      },
    );
  } catch (e) {
    console.error("JWT verification error in authMiddleware", e);
    return res.status(500).json({ message: "Failed to protectedRoute" });
  }
};

// Middleware to check if the user is an admin
export const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Not authorized as an admin" });
  }
};

// Optional authentication middleware (for guest or logged in user)
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      req.user = null;
      return next();
    }

    jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET,
      async (err, decodedUser) => {
        if (err) {
          console.log(err);
          return res
            .status(403)
            .json({ message: "Access token is invalid or expired" });
        }

        const user = await User.findById(decodedUser.userId).select(
          "-passwordHash",
        );

        if (!user) {
          return res.status(404).json({ message: "User does not exist" });
        }

        req.user = user;
        next();
      },
    );
  } catch (e) {
    console.error("JWT verification error in optionalAuth", e);
    return res.status(500).json({ message: "Failed to authenticate" });
  }
};
