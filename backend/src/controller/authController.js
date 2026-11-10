import User from "../models/User.js";
import Session from "../models/Session.js";
import { uploadToCloudinary } from "../config/cloudinary.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const ACCESS_TOKEN_TTL = "30m";
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60 * 1000;

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const OAUTH_STATE_COOKIE = "oauthState";
const OAUTH_STATE_TTL = 10 * 60 * 1000;
const GOOGLE_REQUEST_TIMEOUT_MS = 10_000;

const isProduction =
  process.env.NODE_ENV === "production" ||
  Boolean(process.env.RENDER) ||
  Boolean(process.env.CLIENT_URL && process.env.CLIENT_URL.startsWith("https://"));

// The API is served from the storefront origin through the Vercel rewrite, so
// the refresh cookie is first-party. SameSite=Lax is enough (and is not blocked
// by Safari/ITP the way SameSite=None cookies can be).
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

const oauthStateCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  path: "/api/auth",
  maxAge: OAUTH_STATE_TTL,
};

const oauthStateClearOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  path: "/api/auth",
};

const getClientUrl = () =>
  (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/+$/, "");

const redirectToClient = (res, path) => res.redirect(`${getClientUrl()}${path}`);

const safeCompare = (value, expected) => {
  if (typeof value !== "string" || typeof expected !== "string") {
    return false;
  }

  const actualBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);

  return (
    actualBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  );
};

const createAuthSession = async (user) => {
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

  return { token, refreshToken };
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

/**
 * POST /api/auth/avatar
 * Upload or replace the signed-in user's avatar.
 */
export const updateAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Please choose an image to upload." });
    }

    const result = await uploadToCloudinary(req.file.buffer, {
      resource_type: "image",
      folder: "classyshop/avatars",
      transformation: [
        { width: 400, height: 400, crop: "fill", gravity: "face" },
        { quality: "auto", fetch_format: "auto" },
      ],
    });

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.avatarUrl = result.secure_url;
    await user.save();

    return res.status(200).json({
      message: "Avatar updated successfully",
      user: user.toJSON(),
    });
  } catch (e) {
    console.error("Update avatar error:", e);
    return res.status(500).json({ message: "Could not update your avatar." });
  }
};

// Step 1: send the user to Google's consent screen.
export const googleAuth = (req, res) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const callbackUrl = process.env.GOOGLE_CALLBACK_URL;

    if (!clientId || !callbackUrl) {
      console.error(
        "Google OAuth is not configured: GOOGLE_CLIENT_ID / GOOGLE_CALLBACK_URL is missing.",
      );
      return redirectToClient(res, "/login?oauth=error&reason=not_configured");
    }

    const state = crypto.randomBytes(32).toString("hex");
    res.cookie(OAUTH_STATE_COOKIE, state, oauthStateCookieOptions);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      response_type: "code",
      scope: "openid email profile",
      state,
      prompt: "select_account",
    });

    return res.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
  } catch (e) {
    console.error("Google auth error:", e);
    return redirectToClient(res, "/login?oauth=error&reason=server_error");
  }
};

// Step 2: Google redirects back here. Exchange the code for tokens, then
// create the same refresh-cookie session that email/password login uses.
export const googleCallback = async (req, res) => {
  try {
    const { code, state, error } = req.query;
    const storedState = req.cookies?.[OAUTH_STATE_COOKIE];

    res.clearCookie(OAUTH_STATE_COOKIE, oauthStateClearOptions);

    if (error) {
      return redirectToClient(res, "/login?oauth=error&reason=cancelled");
    }

    if (!code || !state || !storedState || !safeCompare(state, storedState)) {
      return redirectToClient(res, "/login?oauth=error&reason=invalid_state");
    }

    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_CALLBACK_URL,
        grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(GOOGLE_REQUEST_TIMEOUT_MS),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error("Google token exchange failed:", tokenData);
      return redirectToClient(res, "/login?oauth=error&reason=token_exchange");
    }

    const profileResponse = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
      signal: AbortSignal.timeout(GOOGLE_REQUEST_TIMEOUT_MS),
    });

    const profile = await profileResponse.json();

    if (!profileResponse.ok || !profile.sub || !profile.email) {
      console.error("Google profile request failed:", profile);
      return redirectToClient(res, "/login?oauth=error&reason=profile");
    }

    // Only trust a profile when Google explicitly confirms the email is
    // verified. Anything else (false, missing, string values) is rejected.
    if (profile.email_verified !== true) {
      return redirectToClient(res, "/login?oauth=error&reason=email_unverified");
    }

    const email = profile.email.toLowerCase();
    let user = await User.findOne({ googleId: profile.sub });

    if (!user) {
      const existingUser = await User.findOne({ email });

      if (existingUser) {
        // Do not link an existing account based on email alone.
        // Require an established, verified-email ownership check before
        // associating the Google identity, and otherwise leave the accounts unlinked.
        if (existingUser.isEmailVerified && !existingUser.googleId) {
          existingUser.googleId = profile.sub;
          if (!existingUser.avatarUrl && profile.picture) {
            existingUser.avatarUrl = profile.picture;
          }
          await existingUser.save();
          user = existingUser;
        } else {
          return redirectToClient(res, "/login?oauth=error&reason=account_exists");
        }
      } else {
        user = await User.create({
          name: profile.name || email.split("@")[0],
          email,
          googleId: profile.sub,
          avatarUrl: profile.picture || "",
          isEmailVerified: true,
        });
      }
    } else {
      let hasChanges = false;

      if (!user.isEmailVerified) {
        user.isEmailVerified = true;
        hasChanges = true;
      }
      if (!user.avatarUrl && profile.picture) {
        user.avatarUrl = profile.picture;
        hasChanges = true;
      }

      if (hasChanges) {
        await user.save();
      }
    }

        const { token, refreshToken } = await createAuthSession(user);
    res.cookie("refreshToken", refreshToken, refreshCookieOptions);

    return redirectToClient(res, `/oauth/callback?token=${encodeURIComponent(token)}`);
  } catch (e) {
    console.error("Google callback error:", e);
    return redirectToClient(res, "/login?oauth=error&reason=server_error");
  }
};
