import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client";

/**
 * Prisma 7 要求通过 driver adapter 连接数据库（schema 里不再写 url）。
 * 连接串统一读 .env 的 DATABASE_URL。
 */
function createAdapter() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("缺少 DATABASE_URL，请检查 .env");
  const u = new URL(url);
  return new PrismaMariaDb({
    host: u.hostname,
    port: u.port ? Number(u.port) : 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ""),
    connectionLimit: 5,
    charset: "utf8mb4",
  });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter: createAdapter() });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
