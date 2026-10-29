/**
 * @module-note app/api/admin/tickets/[id]/slots/route.ts
 * 后台管理／票务项目／指定id／预约时段接口。HTTP请求进入具名方法后执行校验与业务处理，再以响应返回；权限、错误码和数据范围以各分支为准。
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { guardTicketAdmin } from "@/lib/roles";
import { slotDto } from "@/features/tickets/data";
import { invalidateTicketCatalogCache } from "@/features/tickets/resilience";

/**
 * 提交或创建后台管理／票务项目／指定id／预约时段数据，处理对应 POST 请求。
 * 数据库操作：prisma.ticketSlot.create；注意相应的归属过滤与事务边界。
 * 访问前执行管理员检查，失败直接返回拒绝响应。
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const guard = await guardTicketAdmin(); if (!guard.ok) return guard.response;
  const { id } = await context.params; const body = await request.json().catch(() => null);
  const startAt = new Date(body?.startAt); const endAt = new Date(body?.endAt); const capacity = Math.floor(Number(body?.capacity));
  if (!Number.isFinite(startAt.getTime()) || !Number.isFinite(endAt.getTime()) || endAt <= startAt || capacity < 1) return NextResponse.json({ ok: false, error: "请填写有效的时段与容量" }, { status: 400 });
  const item = await prisma.ticketSlot.create({ data: { ticketItemId: id, startAt, endAt, capacity, warningThreshold: Math.max(1, Math.min(100, Number(body?.warningThreshold) || 80)) } });
  await invalidateTicketCatalogCache();
  return NextResponse.json({ ok: true, item: slotDto(item) }, { status: 201 });
}

