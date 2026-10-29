/**
 * @module-note app/api/admin/tickets/[id]/route.ts
 * 后台管理／票务项目／指定id接口。HTTP请求进入具名方法后执行校验与业务处理，再以响应返回；权限、错误码和数据范围以各分支为准。
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { guardTicketAdmin } from "@/lib/roles";
import { invalidateTicketCatalogCache } from "@/features/tickets/resilience";

/**
 * 局部更新后台管理／票务项目／指定id数据，处理对应 PATCH 请求。
 * 数据库操作：prisma.ticketItem.update；注意相应的归属过滤与事务边界。
 * 访问前执行管理员检查，失败直接返回拒绝响应。
 */
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const guard = await guardTicketAdmin(); if (!guard.ok) return guard.response;
  const { id } = await context.params; const body = await request.json().catch(() => null);
  const allowed = ["DRAFT", "OPEN", "PAUSED", "CLOSED"];
  const item = await prisma.ticketItem.update({ where: { id }, data: { ...(body?.status && allowed.includes(body.status) ? { status: body.status } : {}), ...(body?.title ? { title: String(body.title).trim() } : {}) } });
  await invalidateTicketCatalogCache();
  return NextResponse.json({ ok: true, item });
}

