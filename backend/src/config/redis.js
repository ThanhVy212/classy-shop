import { Redis } from "@upstash/redis";

const getEnv = (key) => process.env[key]?.trim();

export const isRedisConfigured = () =>
  Boolean(
    getEnv("UPSTASH_REDIS_REST_URL") && getEnv("UPSTASH_REDIS_REST_TOKEN"),
  );

let client = null;

// The client is created lazily so the Upstash credentials are read after
// dotenv has populated process.env (server.js loads the .env file first).
export const getRedis = () => {
  if (!isRedisConfigured()) {
    return null;
  }

  if (!client) {
    client = new Redis({
      url: getEnv("UPSTASH_REDIS_REST_URL"),
      token: getEnv("UPSTASH_REDIS_REST_TOKEN"),
    });
  }

  return client;
};
