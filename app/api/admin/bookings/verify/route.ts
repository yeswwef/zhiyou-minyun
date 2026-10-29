/**
 * @module-note app/api/admin/bookings/verify/route.ts
 * 后台管理／票务预约／核销接口。HTTP请求进入具名方法后执行校验与业务处理，再以响应返回；权限、错误码和数据范围以各分支为准。
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { guardTicketAdmin } from "@/lib/roles";

/**
 * 提交或创建后台管理／票务预约／核销数据，处理对应 POST 请求。
 * 数据库操作：prisma.ticketBooking.findUnique、prisma.ticketBooking.update；注意相应的归属过滤与事务边界。
 * 访问前执行管理员检查，失败直接返回拒绝响应。
 */
export async function POST(request: NextRequest) {
  const guard = await guardTicketAdmin(); if (!guard.ok) return guard.response;
  const body = await request.json().catch(() => null); const verifyCode = String(body?.verifyCode ?? "").trim();
  const booking = await prisma.ticketBooking.findUnique({ where: { verifyCode }, include: { slot: { include: { ticketItem: { include: { venue: true } } } }, user: { select: { username: true } } } });
  if (!booking) return NextResponse.json({ ok: false, error: "核销码不存在" }, { status: 404 });
  if (booking.status !== "CONFIRMED") return NextResponse.json({ ok: false, error: `当前状态为 ${booking.status}，不能重复核销` }, { status: 409 });
  const item = await prisma.ticketBooking.update({ where: { id: booking.id }, data: { status: "VERIFIED", verifiedAt: new Date() } });
  return NextResponse.json({ ok: true, item, booking });
}

