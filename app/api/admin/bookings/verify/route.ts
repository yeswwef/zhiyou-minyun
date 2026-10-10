import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { guardAdmin } from "@/lib/roles";

export async function POST(request: NextRequest) {
  const guard = await guardAdmin(); if (!guard.ok) return guard.response;
  const body = await request.json().catch(() => null); const verifyCode = String(body?.verifyCode ?? "").trim();
  const booking = await prisma.ticketBooking.findUnique({ where: { verifyCode }, include: { slot: { include: { ticketItem: { include: { venue: true } } } }, user: { select: { username: true } } } });
  if (!booking) return NextResponse.json({ ok: false, error: "核销码不存在" }, { status: 404 });
  if (booking.status !== "CONFIRMED") return NextResponse.json({ ok: false, error: `当前状态为 ${booking.status}，不能重复核销` }, { status: 409 });
  const item = await prisma.ticketBooking.update({ where: { id: booking.id }, data: { status: "VERIFIED", verifiedAt: new Date() } });
  return NextResponse.json({ ok: true, item, booking });
}
