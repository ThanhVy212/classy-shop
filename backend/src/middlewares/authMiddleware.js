import jwt from "jsonwebtoken";
import User from "../models/User.js";

// authorization
export const protectedRoute = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    // Never reveal whether a protected endpoint exists or what is missing.
    if (!token) {
      return res.status(401).end();
    }

    jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET,
      async (err, decodedUser) => {
        if (err) {
          console.log(err);
          return res.status(401).end();
        }

        const user = await User.findById(decodedUser.userId).select(
          "-passwordHash",
        );

        if (!user) {
          return res.status(401).end();
        }

        req.user = user;
        next();
      },
    );
  } catch (e) {
    console.error("JWT verification error in authMiddleware", e);
    return res.status(500).end();
  }
};

// Middleware to check if the authenticated user is an admin.
// Must be used after protectedRoute. Returns 404 without a body so callers
// cannot discover which admin-only endpoints exist.
export const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    return next();
  }

  return res.status(404).end();
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
          return res.status(401).end();
        }

        const user = await User.findById(decodedUser.userId).select(
          "-passwordHash",
        );

        if (!user) {
          return res.status(401).end();
        }

        req.user = user;
        next();
      },
    );
  } catch (e) {
    console.error("JWT verification error in optionalAuth", e);
    return res.status(500).end();
  }
};
