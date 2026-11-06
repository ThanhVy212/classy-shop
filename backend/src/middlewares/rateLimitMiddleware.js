import crypto from "crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { getRedis, isRedisConfigured } from "../config/redis.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const limiterCache = new Map();

// Options can be static values or functions. Functions are evaluated on each
// request so values from process.env are read after dotenv has run.
const resolve = (value) => (typeof value === "function" ? value() : value);

const intFromEnv = (name, fallback) => {
  const parsed = Number.parseInt(process.env[name], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

// Mirrors the duration parser used by Ratelimit.slidingWindow (see
// @upstash/ratelimit): decimals and the "w" unit are supported, and the
// resulting duration must be at least 1 ms.
const DURATION_PATTERN = /^(\d+(?:\.\d+)?)\s?(ms|s|m|h|d|w)$/;

const DURATION_IN_MS = {
  ms: 1,
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
};

const isValidDuration = (value) => {
  const match = DURATION_PATTERN.exec(value);

  if (!match) {
    return false;
  }

  const milliseconds = Math.round(
    Number.parseFloat(match[1]) * DURATION_IN_MS[match[2]],
  );

  return milliseconds >= 1;
};

// Windows are resolved once per env variable and reused, so a malformed value
// only logs a warning a single time instead of on every request.
const windowCache = new Map();

const windowFromEnv = (name, fallback) => {
  if (windowCache.has(name)) {
    return windowCache.get(name);
  }

  const value = process.env[name]?.trim();
  let window = value || fallback;

  if (value && !isValidDuration(value)) {
    console.warn(
      `[rate-limit] Invalid ${name}="${value}". Expected a duration such as ` +
        `"30 s", "1 m", "1.5 h" or "1 w". Using "${fallback}" instead.`,
    );
    window = fallback;
  }

  windowCache.set(name, window);
  return window;
};

const getClientIp = (req) =>
  req.ip || req.socket?.remoteAddress || "unknown";

const getLimiter = ({ name, max, window }) => {
  const id = `${name}:${max}:${window}`;

  if (limiterCache.has(id)) {
    return limiterCache.get(id);
  }

  const redis = getRedis();

  if (!redis) {
    return null;
  }

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(max, window),
    prefix: `classyshop:ratelimit:${name}`,
    // Answers repeated blocked requests from memory without hitting Redis.
    ephemeralCache: new Map(),
    analytics: false,
  });

  limiterCache.set(id, limiter);
  return limiter;
};

const setRateLimitHeaders = (res, { limit, remaining, reset }) => {
  const resetInSeconds = Math.max(0, Math.ceil((reset - Date.now()) / 1000));

  res.setHeader("RateLimit-Limit", limit);
  res.setHeader("RateLimit-Remaining", remaining);
  res.setHeader("RateLimit-Reset", resetInSeconds);
  res.setHeader("X-RateLimit-Limit", limit);
  res.setHeader("X-RateLimit-Remaining", remaining);
  res.setHeader("X-RateLimit-Reset", resetInSeconds);

  return resetInSeconds;
};

/**
 * Creates an Express middleware backed by Upstash Redis.
 *
 * @param {object} options
 * @param {string} options.name        Limiter name, also used as the Redis key prefix.
 * @param {number|Function} options.max     Requests allowed per window.
 * @param {string|Function} options.window  Window duration, e.g. "1 m", "10 m", "1 h".
 * @param {Function} [options.keyGenerator] Returns the identifier to limit (defaults to client IP).
 * @param {Function} [options.skip]    Returns true to bypass the limiter for a request.
 * @param {string} [options.message]   Body message returned with HTTP 429.
 * @param {boolean} [options.failOpen] Allow the request when Redis is unavailable. Defaults to true.
 */
export const rateLimit = ({
  name,
  max,
  window,
  keyGenerator = getClientIp,
  skip,
  message = "Too many requests. Please try again later.",
  failOpen = true,
} = {}) => {
  return async (req, res, next) => {
    if (process.env.RATE_LIMIT_ENABLED === "false") {
      return next();
    }

    if (skip?.(req)) {
      return next();
    }

    // Without Upstash credentials the API keeps working uninterrupted.
    if (!isRedisConfigured()) {
      return next();
    }

    const identifier = keyGenerator(req);

    if (!identifier) {
      return next();
    }

    const limiter = getLimiter({
      name,
      max: resolve(max),
      window: resolve(window),
    });

    if (!limiter) {
      return next();
    }

    try {
      const result = await limiter.limit(String(identifier));
      const resetInSeconds = setRateLimitHeaders(res, result);

      if (result.success) {
        return next();
      }

      res.setHeader("Retry-After", resetInSeconds);

      return res.status(429).json({ message });
    } catch (error) {
      console.error(`[rate-limit:${name}] Upstash Redis error:`, error.message);

      if (failOpen) {
        return next();
      }

      return res.status(503).json({
        message: "Rate limiting is temporarily unavailable. Please try again.",
      });
    }
  };
};

// Broad protection applied to every /api request.
export const apiRateLimit = rateLimit({
  name: "api",
  max: () => intFromEnv("RATE_LIMIT_API_MAX", 300),
  window: () => windowFromEnv("RATE_LIMIT_API_WINDOW", "1 m"),
});

// Applies to POST/PUT/PATCH/DELETE requests only.
export const writeRateLimit = rateLimit({
  name: "write",
  max: () => intFromEnv("RATE_LIMIT_WRITE_MAX", 60),
  window: () => windowFromEnv("RATE_LIMIT_WRITE_WINDOW", "1 m"),
  skip: (req) => SAFE_METHODS.has(req.method),
});

// Brute-force protection for the whole authentication surface.
export const authRateLimit = rateLimit({
  name: "auth",
  max: () => intFromEnv("RATE_LIMIT_AUTH_MAX", 20),
  window: () => windowFromEnv("RATE_LIMIT_AUTH_WINDOW", "10 m"),
});

// Per IP + account, so one account cannot be brute-forced from many attempts.
export const loginRateLimit = rateLimit({
  name: "login",
  max: () => intFromEnv("RATE_LIMIT_LOGIN_MAX", 5),
  window: () => windowFromEnv("RATE_LIMIT_LOGIN_WINDOW", "10 m"),
  keyGenerator: (req) => {
    const rawIdentity = req.body?.email ?? req.body?.username;
    const identity =
      typeof rawIdentity === "string" ? rawIdentity.trim().toLowerCase() : "";
    // Hash the identity so email addresses/usernames never end up in Redis keys.
    const identityHash = crypto
      .createHash("sha256")
      .update(identity)
      .digest("hex");

    return `${getClientIp(req)}:${identityHash}`;
  },
});

export const registerRateLimit = rateLimit({
  name: "register",
  max: () => intFromEnv("RATE_LIMIT_REGISTER_MAX", 5),
  window: () => windowFromEnv("RATE_LIMIT_REGISTER_WINDOW", "1 h"),
});

// Two-layer refresh rate limiting:
//
//   1. refreshIpRateLimit  – keyed by client IP, higher cap.
//      Bounds the total request volume from one IP regardless of how many
//      different cookie values it presents. Prevents an attacker from
//      bypassing the token-keyed limiter by cycling through fresh cookies.
//
//   2. refreshRateLimit    – keyed by hashed refresh-token, lower cap.
//      Protects individual sessions: several tabs (or several users behind
//      one NAT) each consume their own bucket so a busy multi-tab session
//      does not exhaust a shared IP quota. Requests without a cookie fall
//      back to the IP so they are still covered.
//
// Apply both in order: IP limiter first, token limiter second.
export const refreshIpRateLimit = rateLimit({
  name: "refresh-ip",
  max: () => intFromEnv("RATE_LIMIT_REFRESH_IP_MAX", 200),
  window: () => windowFromEnv("RATE_LIMIT_REFRESH_IP_WINDOW", "15 m"),
});

export const refreshRateLimit = rateLimit({
  name: "refresh",
  max: () => intFromEnv("RATE_LIMIT_REFRESH_MAX", 60),
  window: () => windowFromEnv("RATE_LIMIT_REFRESH_WINDOW", "15 m"),
  keyGenerator: (req) => {
    const token = req.cookies?.refreshToken;

    if (typeof token === "string" && token.trim()) {
      return crypto.createHash("sha256").update(token.trim()).digest("hex");
    }

    return getClientIp(req);
  },
});

export const uploadRateLimit = rateLimit({
  name: "upload",
  max: () => intFromEnv("RATE_LIMIT_UPLOAD_MAX", 30),
  window: () => windowFromEnv("RATE_LIMIT_UPLOAD_WINDOW", "10 m"),
  keyGenerator: (req) => req.user?.id || getClientIp(req),
});
