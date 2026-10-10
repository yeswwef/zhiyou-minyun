import "server-only";

import Redis from "ioredis";

type RedisResult<T> =
  | { available: true; value: T }
  | { available: false };

type RedisGlobal = typeof globalThis & {
  ticketRedis?: Redis;
  ticketRedisDisabledUntil?: number;
};

const redisGlobal = globalThis as RedisGlobal;
const REDIS_RETRY_DELAY_MS = 30_000;

function createRedisClient() {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;

  const client = new Redis(url, {
    lazyConnect: true,
    connectTimeout: 800,
    commandTimeout: 1_000,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    retryStrategy: () => null,
  });

  // Redis 是可选加速层；连接失败时不能让未监听的 error 事件终止进程。
  client.on("error", () => undefined);
  return client;
}

function getRedisClient() {
  if (!process.env.REDIS_URL?.trim()) return null;
  if ((redisGlobal.ticketRedisDisabledUntil ?? 0) > Date.now()) return null;
  if (!redisGlobal.ticketRedis || redisGlobal.ticketRedis.status === "end") {
    redisGlobal.ticketRedis = createRedisClient() ?? undefined;
  }
  return redisGlobal.ticketRedis ?? null;
}

/**
 * 执行一次 Redis 操作。Redis 未配置或暂时不可用时返回 available=false，
 * 调用方必须回退到本地内存或数据库，不能让缓存成为票务服务单点故障。
 */
export async function runRedis<T>(operation: (redis: Redis) => Promise<T>): Promise<RedisResult<T>> {
  const redis = getRedisClient();
  if (!redis) return { available: false };

  try {
    if (redis.status === "wait") await redis.connect();
    return { available: true, value: await operation(redis) };
  } catch {
    redisGlobal.ticketRedisDisabledUntil = Date.now() + REDIS_RETRY_DELAY_MS;
    redis.disconnect(false);
    redisGlobal.ticketRedis = undefined;
    return { available: false };
  }
}
