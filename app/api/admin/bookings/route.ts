/**
 * @module-note app/api/admin/bookings/route.ts
 * 后台管理／票务预约接口。HTTP请求进入具名方法后执行校验与业务处理，再以响应返回；权限、错误码和数据范围以各分支为准。
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { guardTicketAdmin } from "@/lib/roles";

/**
 * 读取后台管理／票务预约数据，处理对应 GET 请求。
 * 数据库操作：prisma.ticketBooking.findMany；注意相应的归属过滤与事务边界。
 * 访问前执行管理员检查，失败直接返回拒绝响应。
 */
export async function GET() {
  const guard = await guardTicketAdmin(); if (!guard.ok) return guard.response;
  const data = await prisma.ticketBooking.findMany({ include: { user: { select: { username: true, nickname: true } }, slot: { include: { ticketItem: { include: { venue: true } } } } }, orderBy: { createdAt: "desc" }, take: 200 });
  return NextResponse.json({ ok: true, data });
}

