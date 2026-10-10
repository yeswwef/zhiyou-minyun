import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { guardVisitor } from "@/lib/roles";

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
