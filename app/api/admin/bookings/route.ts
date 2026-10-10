import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { guardAdmin } from "@/lib/roles";

export async function GET() {
  const guard = await guardAdmin(); if (!guard.ok) return guard.response;
  const data = await prisma.ticketBooking.findMany({ include: { user: { select: { username: true, nickname: true } }, slot: { include: { ticketItem: { include: { venue: true } } } } }, orderBy: { createdAt: "desc" }, take: 200 });
  return NextResponse.json({ ok: true, data });
}
