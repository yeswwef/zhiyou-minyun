/**
 * @module-note app/api/admin/venues/route.ts
 * 后台管理／场馆接口。HTTP请求进入具名方法后执行校验与业务处理，再以响应返回；权限、错误码和数据范围以各分支为准。
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { guardTicketAdmin } from "@/lib/roles";
import { invalidateTicketCatalogCache } from "@/features/tickets/resilience";

/**
 * 读取后台管理／场馆数据，处理对应 GET 请求。
 * 数据库操作：prisma.venue.findMany；注意相应的归属过滤与事务边界。
 * 访问前执行管理员检查，失败直接返回拒绝响应。
 */
export async function GET() {
  const guard = await guardTicketAdmin(); if (!guard.ok) return guard.response;
  const data = await prisma.venue.findMany({ include: { _count: { select: { tickets: true } } }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ ok: true, data });
}

/**
 * 提交或创建后台管理／场馆数据，处理对应 POST 请求。
 * 数据库操作：prisma.venue.create；注意相应的归属过滤与事务边界。
 * 访问前执行管理员检查，失败直接返回拒绝响应。
 */
export async function POST(request: NextRequest) {
  const guard = await guardTicketAdmin(); if (!guard.ok) return guard.response;
  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? "").trim(); const address = String(body?.address ?? "").trim();
  if (!name || !address || !["SCENIC", "MUSEUM", "PERFORMANCE"].includes(body?.type)) return NextResponse.json({ ok: false, error: "请完整填写场馆信息" }, { status: 400 });
  const item = await prisma.venue.create({ data: { name, address, type: body.type, contact: body.contact || null, image: body.image || null } });
  await invalidateTicketCatalogCache();
  return NextResponse.json({ ok: true, item }, { status: 201 });
}

