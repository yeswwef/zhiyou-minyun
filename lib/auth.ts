import { cookies } from "next/headers";
import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { prisma } from "./db";

export const SESSION_COOKIE_NAME = "zhiyou_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 天

function getSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (secret) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error("生产环境必须配置 AUTH_SECRET");
  }

  return "zhiyou-minyun-dev-secret-change-me";
}

/** 使用 scrypt 加盐哈希密码，存储格式为 `盐:哈希` */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/** 校验明文密码与存储的哈希是否匹配 */
export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return (
    candidate.length === expected.length && timingSafeEqual(candidate, expected)
  );
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

/** 生成带过期时间的签名会话 token */
export function createSessionToken(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ userId, exp: Date.now() + SESSION_TTL_SECONDS * 1000 }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/** 校验会话 token，合法则返回 userId，否则返回 null */
export function verifySessionToken(token: string): { userId: string } | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof data.userId !== "string") return null;
    if (typeof data.exp === "number" && data.exp < Date.now()) return null;
    return { userId: data.userId };
  } catch {
    return null;
  }
}

/** 从请求 cookie 中解析当前登录用户 id（未登录返回 null） */
export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token)?.userId ?? null;
}

export type SessionUser = {
  id: string;
  username: string;
  nickname: string | null;
  role: "C" | "B" | "ADMIN";
  merchantName: string | null;
  createdAt: Date;
};

/** 获取当前登录用户（未登录返回 null） */
export async function getSessionUser(): Promise<SessionUser | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      nickname: true,
      role: true,
      merchantName: true,
      createdAt: true,
    },
  });
  return user;
}
