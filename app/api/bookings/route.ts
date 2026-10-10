import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { guardVisitor } from "@/lib/roles";
import { slotDto, ticketBookingNo, ticketVerifyCode } from "@/features/tickets/data";
import {
  BookingQueueBusyError,
  consumeTicketRateLimit,
  requestFingerprint,
  withBookingAdmission,
} from "@/features/tickets/resilience";

const bookingInclude = { slot: { include: { ticketItem: { include: { venue: true } } } } } as const;

export async function GET() {
  const guard = await guardVisitor();
  if (!guard.ok) return guard.response;
  const bookings = await prisma.ticketBooking.findMany({
    where: { userId: guard.userId },
    include: bookingInclude,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ ok: true, data: bookings.map((item) => ({ ...item, slot: slotDto(item.slot) })) });
}

export async function POST(request: NextRequest) {
  const guard = await guardVisitor();
  if (!guard.ok) return guard.response;
  const body = await request.json().catch(() => null);
  const slotId = String(body?.slotId ?? "");
  const quantity = Math.max(1, Math.min(10, Math.floor(Number(body?.quantity) || 1)));
  const contactName = String(body?.contactName ?? "").trim();
  const contactPhone = String(body?.contactPhone ?? "").trim();
  if (!slotId || !contactName || !/^1\d{10}$/.test(contactPhone)) {
    return NextResponse.json({ ok: false, error: "请填写预约人姓名和正确的手机号" }, { status: 400 });
  }

  const [userRate, ipRate, slotRate] = await Promise.all([
    consumeTicketRateLimit(`booking:user:${guard.userId}`, 6, 10_000),
    consumeTicketRateLimit(`booking:ip:${requestFingerprint(request)}`, 20, 10_000),
    consumeTicketRateLimit(`booking:slot:${slotId}`, 100, 1_000),
  ]);
  const limited = [userRate, ipRate, slotRate].find((item) => !item.allowed);
  if (limited) {
    return NextResponse.json(
      { ok: false, error: "当前预约人数较多，请稍后重试" },
      { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil(limited.retryAfterMs / 1_000))) } },
    );
  }

  try {
    const booking = await withBookingAdmission(() => prisma.$transaction(async (tx) => {
      const now = new Date();
      const slot = await tx.ticketSlot.findFirst({
        where: { id: slotId, status: "OPEN", startAt: { gt: now }, ticketItem: { status: "OPEN", venue: { enabled: true } } },
        select: { id: true },
      });
      if (!slot) throw new Error("NO_CAPACITY");

      // 数据库条件更新是抢票的最终一致性边界。缓存只能减压，不能决定是否有票。
      const claimed = await tx.$executeRaw`
        UPDATE TicketSlot
        SET bookedCount = bookedCount + ${quantity}, updatedAt = NOW(3)
        WHERE id = ${slotId}
          AND status = 'OPEN'
          AND startAt > ${now}
          AND bookedCount + ${quantity} <= capacity
      `;
      if (Number(claimed) !== 1) throw new Error("NO_CAPACITY");

      return tx.ticketBooking.create({
        data: {
          bookingNo: ticketBookingNo(), verifyCode: ticketVerifyCode(), userId: guard.userId,
          slotId, quantity, contactName, contactPhone,
        },
        include: bookingInclude,
      });
    }, { timeout: 5_000 }));
    return NextResponse.json({ ok: true, item: { ...booking, slot: slotDto(booking.slot) } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (error instanceof BookingQueueBusyError) {
      return NextResponse.json(
        { ok: false, error: "预约队列繁忙，请稍后重试" },
        { status: 503, headers: { "Retry-After": "1" } },
      );
    }
    if (message === "NO_CAPACITY") {
      const requestedSlot = await prisma.ticketSlot.findUnique({ where: { id: slotId }, select: { ticketItemId: true } });
      const alternatives = await prisma.ticketSlot.findMany({
        where: {
          id: { not: slotId },
          ...(requestedSlot ? { ticketItemId: requestedSlot.ticketItemId } : {}),
          status: "OPEN",
          startAt: { gt: new Date() },
        },
        include: { ticketItem: { include: { venue: true } } }, orderBy: { startAt: "asc" }, take: 3,
      });
      return NextResponse.json({ ok: false, error: "该时段余票不足，请选择推荐时段", alternatives: alternatives.filter((s) => s.capacity - s.bookedCount >= quantity).map((s) => ({ ...slotDto(s), title: s.ticketItem.title, venueName: s.ticketItem.venue.name })) }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: "预约失败，请稍后重试" }, { status: 409 });
  }
}
