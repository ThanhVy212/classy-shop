import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const HAS_SESSION_KEY = "classyshop_has_session";

let inMemoryToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  inMemoryToken = token;
};

export const getAccessToken = () => inMemoryToken;

/**
 * True only when the server explicitly says the session is no longer valid.
 * Network failures, timeouts, 429 rate limits and 5xx responses are transient
 * and must never be treated as "you are logged out".
 */
export const isDefinitiveAuthError = (error: unknown): boolean =>
  axios.isAxiosError(error) &&
  (error.response?.status === 401 || error.response?.status === 403);

type AuthFailureHandler = () => void;

let authFailureHandler: AuthFailureHandler | null = null;

/**
 * Lets AuthContext mirror a session that expired while the app was running.
 * Without this, axios would clear the token but React would keep showing a
 * signed-in UI.
 */
export const setAuthFailureHandler = (
  handler: AuthFailureHandler | null
) => {
  authFailureHandler = handler;
};

// Every caller that needs a new access token awaits the same in-flight
// request. Without this, React StrictMode double effects and a burst of 401s
// each fire their own /auth/refresh call and burn through the refresh quota.
let refreshInFlight: Promise<string> | null = null;

const requestNewAccessToken = async (): Promise<string> => {
  const { data } = await axios.post<{ accessToken: string }>(
    `${API_BASE_URL}/auth/refresh`,
    {},
    { withCredentials: true }
  );

  if (!data?.accessToken) {
    throw new Error("Unable to refresh your session.");
  }

  setAccessToken(data.accessToken);
  return data.accessToken;
};

export const refreshAccessToken = (): Promise<string> => {
  if (!refreshInFlight) {
    refreshInFlight = requestNewAccessToken().finally(() => {
      refreshInFlight = null;
    });
  }

  return refreshInFlight;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    if (inMemoryToken && config.headers) {
      config.headers.Authorization = `Bearer ${inMemoryToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    // Attempt token refresh on 401 (expired access token). A 403 means the
    // user is authenticated but lacks the required role, so refreshing would
    // not help and must not be attempted.
    if (
      error.response?.status === 401 &&
      !originalRequest?._retry &&
      inMemoryToken &&
      !originalRequest?.url?.includes("/auth/login") &&
      !originalRequest?.url?.includes("/auth/register") &&
      !originalRequest?.url?.includes("/auth/refresh")
    ) {
      originalRequest._retry = true;
      try {
        const accessToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Only clear the session when the refresh endpoint definitively says
        // it is gone. A transient failure (offline, cold backend, 429, 5xx)
        // keeps the stored session so the next request or reload can retry.
        if (isDefinitiveAuthError(refreshError)) {
          setAccessToken(null);
          localStorage.removeItem(HAS_SESSION_KEY);
          authFailureHandler?.();
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
