/**
 * @module-note app/api/bookings/[id]/route.ts
 * 票务预约／指定id接口。HTTP请求进入具名方法后执行校验与业务处理，再以响应返回；权限、错误码和数据范围以各分支为准。
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { guardVisitor } from "@/lib/roles";

/**
 * 局部更新票务预约／指定id数据，处理对应 PATCH 请求。
 * 数据库操作：prisma.$transaction、tx.ticketBooking.findFirst、tx.ticketBooking.update、tx.ticketSlot.update；注意相应的归属过滤与事务边界。
 * 访问前执行游客角色检查，失败直接返回拒绝响应。
 */
export async function PATCH(_: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await guardVisitor();
  if (!guard.ok) return guard.response;
  const { id } = await context.params;
  try {
    await prisma.$transaction(async (tx) => {
      const booking = await tx.ticketBooking.findFirst({ where: { id, userId: guard.userId, status: "CONFIRMED" } });
      if (!booking) throw new Error("NOT_CANCELLABLE");
      await tx.ticketBooking.update({ where: { id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
      await tx.ticketSlot.update({ where: { id: booking.slotId }, data: { bookedCount: { decrement: booking.quantity } } });
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "该预约不存在或当前状态不能取消" }, { status: 409 });
  }
}
