import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";

export const ADMIN_NOTIFICATION_EVENT = "admin:notification";
export const ADMIN_STOCK_ALERT_EVENT = "admin:stock-alert";
export const ADMIN_STOCK_UPDATED_EVENT = "admin:stock-updated";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || API_BASE_URL.replace(/\/api\/?$/, "");

let socket: Socket | null = null;

export const getAdminSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      // Sends the httpOnly refreshToken cookie used to authenticate admins.
      withCredentials: true,
      autoConnect: false,
      transports: ["websocket", "polling"],
    });
  }

  return socket;
};

export const connectAdminSocket = () => {
  const current = getAdminSocket();

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
