import { Server } from "socket.io";
import Session from "../models/Session.js";
import User from "../models/User.js";

export const ADMIN_ROOM = "admin:all";
export const ADMIN_NOTIFICATION_EVENT = "admin:notification";

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

    if (!user || user.role !== "admin") {
      return next(new Error("Forbidden"));
    }

    socket.data.userId = String(user._id);
    socket.data.role = user.role;

    return next();
  } catch (error) {
    console.error("Socket authentication error:", error);
    return next(new Error("Unauthorized"));
  }
};

export const initSocket = (httpServer) => {
  if (io) return io;

  const allowedOrigin = (process.env.CLIENT_URL || "").replace(/\/+$/, "");

  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true,
    },
    // CORS does not protect WebSocket upgrades, so validate the Origin for
    // browser clients as well. Non-browser clients have no Origin header but
    // still need a valid refresh cookie below.
    allowRequest: (req, callback) => {
      const origin = req.headers.origin;

      if (!origin) {
        return callback(null, true);
      }

      return callback(null, origin.replace(/\/+$/, "") === allowedOrigin);
    },
  });

  io.use(authenticateAdmin);

  io.on("connection", (socket) => {
    // Every admin receives team-wide notifications.
    socket.join(ADMIN_ROOM);
    // A personal room is useful for future per-admin events (read state,
    // multi-tab sync, ...).
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
