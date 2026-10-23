/**
 * @module-note app/api/admin/tickets/route.ts
 * 后台管理／票务项目接口。HTTP请求进入具名方法后执行校验与业务处理，再以响应返回；权限、错误码和数据范围以各分支为准。
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { guardAdmin } from "@/lib/roles";
import { slotDto } from "@/features/tickets/data";
import { invalidateTicketCatalogCache } from "@/features/tickets/resilience";

/**
 * 读取后台管理／票务项目数据，处理对应 GET 请求。
 * 数据库操作：prisma.ticketItem.findMany；注意相应的归属过滤与事务边界。
 * 访问前执行管理员检查，失败直接返回拒绝响应。
 */
export async function GET() {
  const guard = await guardAdmin(); if (!guard.ok) return guard.response;
  const data = await prisma.ticketItem.findMany({ include: { venue: true, slots: { orderBy: { startAt: "asc" } }, _count: { select: { slots: true } } }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ ok: true, data: data.map((t) => ({ ...t, slots: t.slots.map(slotDto) })) });
}

/**
 * 提交或创建后台管理／票务项目数据，处理对应 POST 请求。
 * 数据库操作：prisma.ticketItem.create；注意相应的归属过滤与事务边界。
 * 访问前执行管理员检查，失败直接返回拒绝响应。
 */
export async function POST(request: NextRequest) {
  const guard = await guardAdmin(); if (!guard.ok) return guard.response;
  const body = await request.json().catch(() => null); const title = String(body?.title ?? "").trim(); const summary = String(body?.summary ?? "").trim();
  if (!body?.venueId || !title || !summary) return NextResponse.json({ ok: false, error: "请完整填写票务项目" }, { status: 400 });
  const item = await prisma.ticketItem.create({ data: { venueId: String(body.venueId), createdByAdminId: guard.userId, title, summary, description: body.description || null, notice: body.notice || null, image: body.image || null, status: body.status === "OPEN" ? "OPEN" : "DRAFT" }, include: { venue: true } });
  await invalidateTicketCatalogCache();
  return NextResponse.json({ ok: true, item }, { status: 201 });
}
