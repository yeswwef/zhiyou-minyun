import { NextResponse } from "next/server";
import { getSessionUserId } from "./auth";
import { prisma } from "./db";

export type GuardResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

/**
 * 游客端写操作守卫。
 * - 未登录 → 401
 * - 商户账号（role = B）→ 403，商户端账号不能使用游客端功能
 */
export async function guardVisitor(): Promise<GuardResult> {
  const userId = await getSessionUserId();
  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: "请先登录" }, { status: 401 }),
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (user?.role !== "C") {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "当前账号不能使用游客端功能" },
        { status: 403 },
      ),
    };
  }

  return { ok: true, userId };
}

export async function guardAdmin(): Promise<GuardResult> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false, response: NextResponse.json({ ok: false, error: "请先登录管理员账号" }, { status: 401 }) };
  }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== "ADMIN") {
    return { ok: false, response: NextResponse.json({ ok: false, error: "无管理员权限" }, { status: 403 }) };
  }
  return { ok: true, userId };
}
