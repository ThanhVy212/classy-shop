import User from "../models/User.js";
import Session from "../models/Session.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const ACCESS_TOKEN_TTL = "30m";
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60 * 1000;

const isProduction = process.env.NODE_ENV === "production";

const refreshCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  path: "/",
  maxAge: REFRESH_TOKEN_TTL,
};

const clearCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  path: "/",
};

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "This email already exists." });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = new User({
      name,
      email,
      passwordHash,
    });

    const savedUser = await newUser.save();

    const token = jwt.sign(
      { userId: savedUser._id, email: savedUser.email },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL },
    );

    const refreshToken = crypto.randomBytes(64).toString("hex");

    await Session.create({
      userId: savedUser._id,
      refreshToken,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL),
    });

    res.cookie("refreshToken", refreshToken, refreshCookieOptions);

    return res.status(201).json({
      message: "Register successful",
      token,
      user: savedUser.toJSON(),
    });
  } catch (e) {
    console.error("Register error: ", e);
    return res.status(500).json({ message: "Failed to register new account." });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Incorrect email or password." });
    }

    if (!user.passwordHash) {
      return res
        .status(400)
        .json({ message: "This email has been signed in using Google." });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect email or password." });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL },
    );

    const refreshToken = crypto.randomBytes(64).toString("hex");

    await Session.create({
      userId: user._id,
      refreshToken,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL),
    });

    res.cookie("refreshToken", refreshToken, refreshCookieOptions);

    return res.status(200).json({
      message: "Login successful.",
      token,
      user: user.toJSON(),
    });
  } catch (e) {
    console.error("Login error: ", e);
    return res.status(500).json({ message: "Failed to Login." });
  }
};

export const logout = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;

    console.log(token);

    if (token) {
      await Session.deleteOne({ refreshToken: token });
    }

    res.clearCookie("refreshToken", clearCookieOptions);

    return res.sendStatus(204);
  } catch (e) {
    console.error("Logout error: ", e);
    return res.status(500).json({ message: "Failed to Logout." });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ message: "Token does not exist" });
    }
    const session = await Session.findOne({ refreshToken: token });

    if (!session) {
      return res.status(403).json({ message: "Token is invalid or expired" });
    }
    if (session.expiresAt < new Date()) {
      return res.status(403).json({ message: "Token expired" });
    }

    const accessToken = jwt.sign(
      {
        userId: session.userId,
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL },
    );

    return res.status(200).json({ accessToken });
  } catch (err) {
    console.error("Refresh token error:", err);
    return res.status(500).json({ message: "Failed to refreshToken" });
  }
};

export const getProfile = async (req, res) => {
  try {
    return res.status(200).json({ user: req.user.toJSON() });
  } catch (e) {
    console.error("Get Profile error:", e);
    return res.status(500).json({ message: "Failed to getProfile" });
  }
};
