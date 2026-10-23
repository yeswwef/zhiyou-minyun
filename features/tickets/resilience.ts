/**
 * @module-note features/tickets/resilience.ts
 * 票务基础能力：时段数据转换与缓存减压；库存正确性仍由预约接口数据库事务保证。
 */
import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { runRedis } from "@/lib/redis";

type CacheEnvelope<T> = {
  value: T | null;
  freshUntil: number;
};

type MemoryEntry = {
  payload: string;
  expiresAt: number;
};

type CacheState = "HIT" | "MISS" | "STALE" | "COALESCED";

type ResilienceGlobal = typeof globalThis & {
  ticketMemoryCache?: Map<string, MemoryEntry>;
  ticketInflight?: Map<string, Promise<CachedResult<unknown>>>;
  ticketCacheVersion?: number;
  ticketRateLimits?: Map<string, { count: number; expiresAt: number }>;
  ticketGate?: { active: number; waiting: Array<() => void> };
};

const resilienceGlobal = globalThis as ResilienceGlobal;
const memoryCache = resilienceGlobal.ticketMemoryCache ?? new Map<string, MemoryEntry>();
const inflight = resilienceGlobal.ticketInflight ?? new Map<string, Promise<CachedResult<unknown>>>();
const localRateLimits = resilienceGlobal.ticketRateLimits ?? new Map<string, { count: number; expiresAt: number }>();
const bookingGate = resilienceGlobal.ticketGate ?? { active: 0, waiting: [] };

resilienceGlobal.ticketMemoryCache = memoryCache;
resilienceGlobal.ticketInflight = inflight;
resilienceGlobal.ticketRateLimits = localRateLimits;
resilienceGlobal.ticketGate = bookingGate;
resilienceGlobal.ticketCacheVersion ??= 1;

const MEMORY_CACHE_LIMIT = 500;
const CACHE_PREFIX = "zhiyou:tickets";

export class CacheRebuildBusyError extends Error {
  constructor() {
    super("CACHE_REBUILD_BUSY");
  }
}

export class BookingQueueBusyError extends Error {
  constructor() {
    super("BOOKING_QUEUE_BUSY");
  }
}

export type CachedResult<T> = {
  value: T | null;
  state: CacheState;
};

/**
 * 为缓存有效期加入随机抖动，减少大批键同时失效。
 * 输入：baseMs、jitterRatio；类型与可选项见函数签名。
 */
function jitteredTtl(baseMs: number, jitterRatio: number) {
  return Math.round(baseMs * (1 + Math.random() * jitterRatio));
}

/**
 * 删除过期本地缓存并控制最大条目数。
 */
function compactMemoryCache() {
  const now = Date.now();
  for (const [key, item] of memoryCache) {
    if (item.expiresAt <= now) memoryCache.delete(key);
  }
  while (memoryCache.size > MEMORY_CACHE_LIMIT) {
    const oldest = memoryCache.keys().next().value as string | undefined;
    if (!oldest) break;
    memoryCache.delete(oldest);
  }
}

/**
 * 先查本地缓存，再查 Redis；读取值与逻辑新鲜截止时间。
 * 输入：key；类型与可选项见函数签名。
 */
async function readEnvelope<T>(key: string): Promise<CacheEnvelope<T> | null> {
  const local = memoryCache.get(key);
  if (local && local.expiresAt > Date.now()) {
    return JSON.parse(local.payload) as CacheEnvelope<T>;
  }
  if (local) memoryCache.delete(key);

  const remote = await runRedis((redis) => redis.get(key));
  if (!remote.available || !remote.value) return null;

  const parsed = JSON.parse(remote.value) as CacheEnvelope<T>;
  const ttl = await runRedis((redis) => redis.pttl(key));
  const remaining = ttl.available && ttl.value > 0 ? ttl.value : 1_000;
  memoryCache.set(key, { payload: remote.value, expiresAt: Date.now() + Math.min(remaining, 2_000) });
  compactMemoryCache();
  return parsed;
}

/**
 * 写入本地和 Redis 缓存，同时保存新鲜期与陈旧可用期。
 * 输入：key、value、freshTtlMs、staleTtlMs；类型与可选项见函数签名。
 */
async function writeEnvelope<T>(
  key: string,
  value: T | null,
  freshTtlMs: number,
  staleTtlMs: number,
) {
  const freshUntil = Date.now() + freshTtlMs;
  const payload = JSON.stringify({ value, freshUntil } satisfies CacheEnvelope<T>);
  const expiresAt = freshUntil + staleTtlMs;

  memoryCache.set(key, { payload, expiresAt });
  compactMemoryCache();
  await runRedis((redis) => redis.set(key, payload, "PX", freshTtlMs + staleTtlMs));
}

/**
 * 通过 Redis NX 锁争取重建权，返回持有者令牌与分布式可用状态。
 * 输入：key、ttlMs；类型与可选项见函数签名。
 */
async function acquireRebuildLock(key: string, ttlMs: number) {
  const token = randomUUID();
  const result = await runRedis((redis) => redis.set(`${key}:lock`, token, "PX", ttlMs, "NX"));
  if (!result.available) return { distributed: false, token: null };
  return { distributed: true, token: result.value === "OK" ? token : null };
}

/**
 * 用 Lua 比较持有者令牌后释放锁，避免误删他人的锁。
 * 输入：key、token；类型与可选项见函数签名。
 */
async function releaseRebuildLock(key: string, token: string | null) {
  if (!token) return;
  await runRedis((redis) => redis.eval(
    "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
    1,
    `${key}:lock`,
    token,
  ));
}

/**
 * 锁竞争时优先返回陈旧数据，否则短暂等待其他请求完成重建。
 * 输入：key、stale；类型与可选项见函数签名。
 */
async function waitForRebuild<T>(key: string, stale: CacheEnvelope<T> | null) {
  if (stale) return { value: stale.value, state: "STALE" as const };
  for (let attempt = 0; attempt < 12; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 50 + attempt * 10));
    const cached = await readEnvelope<T>(key);
    if (cached) return { value: cached.value, state: "COALESCED" as const };
  }
  throw new CacheRebuildBusyError();
}

/**
 * 热点数据读取：
 * - fresh TTL 加随机抖动，避免雪崩；
 * - null/空结果短期缓存，避免穿透；
 * - 本进程 Promise 合并 + Redis 分布式锁，避免击穿；
 * - 锁竞争时优先返回陈旧但可用的数据。
 */
export async function getOrLoadTicketCache<T>({
  key,
  loader,
  freshTtlMs = 5_000,
  staleTtlMs = 30_000,
  negativeTtlMs = 15_000,
  isNegative = (value) => value === null,
}: {
  key: string;
  loader: () => Promise<T | null>;
  freshTtlMs?: number;
  staleTtlMs?: number;
  negativeTtlMs?: number;
  isNegative?: (value: T | null) => boolean;
}): Promise<CachedResult<T>> {
  const version = await getTicketCacheVersion();
  const cacheKey = `${CACHE_PREFIX}:v${version}:${key}`;
  const cached = await readEnvelope<T>(cacheKey);
  if (cached && cached.freshUntil > Date.now()) return { value: cached.value, state: "HIT" };

  const current = inflight.get(cacheKey) as Promise<CachedResult<T>> | undefined;
  if (current) {
    const result = await current;
    return { ...result, state: "COALESCED" };
  }

  const rebuilding = (async (): Promise<CachedResult<T>> => {
    const lock = await acquireRebuildLock(cacheKey, 5_000);
    if (lock.distributed && !lock.token) return waitForRebuild(cacheKey, cached);

    try {
      // 获得锁前可能已有其他进程完成重建，二次检查避免重复查询数据库。
      const latest = await readEnvelope<T>(cacheKey);
      if (latest && latest.freshUntil > Date.now()) return { value: latest.value, state: "HIT" };

      const value = await loader();
      const baseTtl = isNegative(value) ? negativeTtlMs : freshTtlMs;
      const fresh = jitteredTtl(baseTtl, isNegative(value) ? 0.35 : 0.8);
      await writeEnvelope(cacheKey, value, fresh, staleTtlMs);
      return { value, state: "MISS" };
    } catch (error) {
      if (cached) return { value: cached.value, state: "STALE" };
      throw error;
    } finally {
      await releaseRebuildLock(cacheKey, lock.token);
    }
  })();

  inflight.set(cacheKey, rebuilding as Promise<CachedResult<unknown>>);
  try {
    return await rebuilding;
  } finally {
    inflight.delete(cacheKey);
  }
}

/**
 * 按搜索词和类型摘要生成稳定的列表缓存键。
 * 输入：q、type；类型与可选项见函数签名。
 */
export function ticketListCacheKey(q: string, type: string) {
  const digest = createHash("sha256").update(`${q}\0${type}`).digest("hex").slice(0, 20);
  return `list:${digest}`;
}

/**
 * 按票务项目ID生成详情缓存键。
 * 输入：id；类型与可选项见函数签名。
 */
export function ticketDetailCacheKey(id: string) {
  return `detail:${id}`;
}

/**
 * 读取缓存命名空间版本，Redis不可用时使用本地版本。
 */
async function getTicketCacheVersion() {
  const remote = await runRedis((redis) => redis.get(`${CACHE_PREFIX}:version`));
  if (remote.available) {
    if (!remote.value) await runRedis((redis) => redis.set(`${CACHE_PREFIX}:version`, "1", "NX"));
    return Number(remote.value) || 1;
  }
  return resilienceGlobal.ticketCacheVersion ?? 1;
}

/** 管理员修改场馆、项目或时段后切换命名空间，旧缓存自然过期。 */
export async function invalidateTicketCatalogCache() {
  resilienceGlobal.ticketCacheVersion = (resilienceGlobal.ticketCacheVersion ?? 1) + 1;
  await runRedis((redis) => redis.incr(`${CACHE_PREFIX}:version`));
}

/**
 * 对代理IP信息做摘要作为限流维度；部署时需保证代理头可信。
 * 输入：request；类型与可选项见函数签名。
 */
export function requestFingerprint(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const raw = forwarded || request.headers.get("x-real-ip") || "local";
  return createHash("sha256").update(raw).digest("hex").slice(0, 20);
}

/**
 * 使用 Redis 原子计数执行窗口限流，不可用时退回进程内计数。
 * 输入：key、limit、windowMs；类型与可选项见函数签名。
 */
export async function consumeTicketRateLimit(key: string, limit: number, windowMs: number) {
  const redisKey = `${CACHE_PREFIX}:rate:${key}`;
  const remote = await runRedis((redis) => redis.eval(
    "local n=redis.call('incr',KEYS[1]); if n==1 then redis.call('pexpire',KEYS[1],ARGV[1]) end; return {n,redis.call('pttl',KEYS[1])}",
    1,
    redisKey,
    windowMs,
  ) as Promise<[number, number]>);

  if (remote.available) {
    const [count, ttl] = remote.value.map(Number);
    return { allowed: count <= limit, remaining: Math.max(0, limit - count), retryAfterMs: Math.max(0, ttl) };
  }

  const now = Date.now();
  const existing = localRateLimits.get(redisKey);
  const item = !existing || existing.expiresAt <= now ? { count: 0, expiresAt: now + windowMs } : existing;
  item.count += 1;
  localRateLimits.set(redisKey, item);
  if (localRateLimits.size > 2_000) {
    for (const [itemKey, value] of localRateLimits) if (value.expiresAt <= now) localRateLimits.delete(itemKey);
  }
  return { allowed: item.count <= limit, remaining: Math.max(0, limit - item.count), retryAfterMs: item.expiresAt - now };
}

/** 限制同时进入数据库事务的抢票请求，保护较小的数据库连接池。 */
export async function withBookingAdmission<T>(operation: () => Promise<T>): Promise<T> {
  const MAX_ACTIVE = 4;
  const MAX_WAITING = 120;
  if (bookingGate.active >= MAX_ACTIVE) {
    if (bookingGate.waiting.length >= MAX_WAITING) throw new BookingQueueBusyError();
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        const index = bookingGate.waiting.indexOf(release);
        if (index >= 0) bookingGate.waiting.splice(index, 1);
        reject(new BookingQueueBusyError());
      }, 2_000);
      /**
       * 释放等待中的任务并清理对应计时器。
       */
      const release = () => {
        clearTimeout(timer);
        resolve();
      };
      bookingGate.waiting.push(release);
    });
  }

  bookingGate.active += 1;
  try {
    return await operation();
  } finally {
    bookingGate.active -= 1;
    bookingGate.waiting.shift()?.();
  }
}
