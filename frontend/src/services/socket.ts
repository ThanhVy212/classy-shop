import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
import { getAccessToken } from "./api";

export const ADMIN_NOTIFICATION_EVENT = "admin:notification";
export const ADMIN_STOCK_ALERT_EVENT = "admin:stock-alert";
export const ADMIN_STOCK_UPDATED_EVENT = "admin:stock-updated";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || API_BASE_URL.replace(/\/api\/?$/, "");

let socket: Socket | null = null;

/**
 * The refresh cookie is scoped to the storefront origin (Vercel), while the
 * socket connects straight to the backend origin. A cross-site handshake would
 * never see that cookie, so the handshake carries the in-memory access token
 * instead.
 */
const attachAccessToken = (target: Socket) => {
  target.auth = { token: getAccessToken() ?? "" };
};

export const getAdminSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      // Kept for local development, where API and socket share localhost and
      // the refresh cookie can still authenticate the handshake.
      withCredentials: true,
      autoConnect: false,
      transports: ["websocket", "polling"],
      auth: { token: getAccessToken() ?? "" },
    });

    // socket.io reuses the original `auth` payload on reconnect. Refresh it
    // on every attempt so a rotated access token does not leave the dashboard
    // permanently disconnected.
    socket.io.on("reconnect_attempt", () => {
      if (socket) attachAccessToken(socket);
    });
  }

  return socket;
};

export const connectAdminSocket = () => {
  const current = getAdminSocket();

  attachAccessToken(current);

  if (!current.connected) {
    current.connect();
  }

  return current;
};

export const disconnectAdminSocket = () => {
  if (!socket) return;

  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
};
