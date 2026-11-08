import { Server } from "socket.io";
import Session from "../models/Session.js";
import User from "../models/User.js";

export const ADMIN_ROOM = "admin:all";
export const ADMIN_NOTIFICATION_EVENT = "admin:notification";
export const ADMIN_STOCK_ALERT_EVENT = "admin:stock-alert";
export const ADMIN_STOCK_UPDATED_EVENT = "admin:stock-updated";

let io = null;

const parseCookies = (header = "") => {
  const cookies = {};

  for (const part of String(header).split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;

    const key = part.slice(0, separator).trim();
    const rawValue = part.slice(separator + 1).trim();
    if (!key) continue;

    try {
      cookies[key] = decodeURIComponent(rawValue);
    } catch {
      cookies[key] = rawValue;
    }
  }

  return cookies;
};

/**
 * Sockets are authenticated with the existing httpOnly refresh cookie. The
 * access token is short lived and lives only in memory, so using the refresh
 * cookie keeps long-lived admin dashboard tabs connected.
 */
const authenticateAdmin = async (socket, next) => {
  try {
    const cookies = parseCookies(socket.handshake.headers.cookie);
    const refreshToken = cookies.refreshToken;

    if (!refreshToken) {
      return next(new Error("Unauthorized"));
    }

    const session = await Session.findOne({ refreshToken }).select(
      "userId expiresAt",
    );

    if (!session || new Date(session.expiresAt).getTime() <= Date.now()) {
      return next(new Error("Unauthorized"));
    }

    const user = await User.findById(session.userId).select("role");

    if (!user) {
      return next(new Error("Unauthorized"));
    }

    if (user.role !== "admin") {
      return next(new Error("Forbidden"));
    }

    socket.data.userId = String(user._id);
    socket.data.role = user.role;

    return next();
  } catch (error) {
    console.error("Socket authentication error:", error);
    return next(new Error("Server error"));
  }
};

export const initSocket = (httpServer) => {
  if (io) return io;

  const rawClientUrls = process.env.CLIENT_URL || "http://localhost:5173";
  const allowedOrigins = rawClientUrls
    .split(",")
    .map((url) => url.trim().replace(/\/+$/, ""))
    .filter(Boolean);

  const checkOrigin = (origin) => {
    if (!origin) return true;
    const cleanOrigin = origin.replace(/\/+$/, "");
    if (allowedOrigins.includes(cleanOrigin)) return true;
    if (
      process.env.NODE_ENV !== "production" &&
      (cleanOrigin.includes("localhost") || cleanOrigin.includes("127.0.0.1"))
    ) {
      return true;
    }
    return false;
  };

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (checkOrigin(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`Socket CORS blocked: ${origin}`));
      },
      credentials: true,
    },
    allowRequest: (req, callback) => {
      const origin = req.headers.origin;
      return callback(null, checkOrigin(origin));
    },
  });

  io.use(authenticateAdmin);

  io.on("connection", (socket) => {
    socket.join(ADMIN_ROOM);
    socket.join(`admin:${socket.data.userId}`);
  });

  return io;
};

export const getIO = () => io;

/** Pushes a newly created notification to every connected admin. */
export const emitAdminNotification = (notification) => {
  if (!io || !notification) return;

  const payload =
    typeof notification.toObject === "function"
      ? notification.toObject()
      : notification;

  io.to(ADMIN_ROOM).emit(ADMIN_NOTIFICATION_EVENT, {
    ...payload,
    isRead: false,
  });
};

/** Pushes a low-stock / out-of-stock alert to every connected admin. */
export const emitAdminStockAlert = (alert) => {
  if (!io || !alert) return;
  io.to(ADMIN_ROOM).emit(ADMIN_STOCK_ALERT_EVENT, alert);
};

/** Tells connected admins that inventory rows changed and should refresh. */
export const emitAdminStockUpdated = (payload = {}) => {
  if (!io) return;
  io.to(ADMIN_ROOM).emit(ADMIN_STOCK_UPDATED_EVENT, {
    ...payload,
    at: new Date().toISOString(),
  });
};
