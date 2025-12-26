import { Redis } from "@upstash/redis";

/**
 * Upstash Redis client singleton
 * Only initialized when environment variables are present
 */
let redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    // Return null if Redis is not configured (allows app to work without rate limiting)
    return null;
  }

  redis = new Redis({
    url,
    token,
  });

  return redis;
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}
