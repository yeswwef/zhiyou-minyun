/**
 * @module-note lib/roles.ts
 * 公共服务层：被页面或接口复用；涉及数据库、会话和基础设施的逻辑应留在服务端。
 */
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

/**
 * 校验后台管理员身份，返回用户ID或拒绝响应。
 * 数据库操作：prisma.user.findUnique；注意相应的归属过滤与事务边界。
 * 依赖当前会话身份，匿名访问和角色限制由下方分支处理。
 */
export async function guardAdmin(): Promise<GuardResult> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false, response: NextResponse.json({ ok: false, error: "请先登录管理员账号" }, { status: 401 }) };
  }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, disabledAt: true } });
  if (!user || user.disabledAt) {
    return { ok: false, response: NextResponse.json({ ok: false, error: "账号不可用，请重新登录" }, { status: 401 }) };
  }
  if (user.role !== "ADMIN") {
    return { ok: false, response: NextResponse.json({ ok: false, error: "无平台管理员权限" }, { status: 403 }) };
  }
  return { ok: true, userId };
}

/** 景点管理员守卫：只允许 TICKET_ADMIN 维护场馆、票务、预约核销与应急工单。 */
export async function guardTicketAdmin(): Promise<GuardResult> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false, response: NextResponse.json({ ok: false, error: "请先登录景点管理员账号" }, { status: 401 }) };
  }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, disabledAt: true } });
  if (!user || user.disabledAt) {
    return { ok: false, response: NextResponse.json({ ok: false, error: "账号不可用，请重新登录" }, { status: 401 }) };
  }
  if (user.role !== "TICKET_ADMIN") {
    return { ok: false, response: NextResponse.json({ ok: false, error: "无景点管理员权限" }, { status: 403 }) };
  }
  return { ok: true, userId };
}
