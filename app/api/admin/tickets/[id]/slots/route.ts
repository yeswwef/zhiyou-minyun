import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { guardAdmin } from "@/lib/roles";
import { slotDto } from "@/features/tickets/data";
import { invalidateTicketCatalogCache } from "@/features/tickets/resilience";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const guard = await guardAdmin(); if (!guard.ok) return guard.response;
  const { id } = await context.params; const body = await request.json().catch(() => null);
  const startAt = new Date(body?.startAt); const endAt = new Date(body?.endAt); const capacity = Math.floor(Number(body?.capacity));
  if (!Number.isFinite(startAt.getTime()) || !Number.isFinite(endAt.getTime()) || endAt <= startAt || capacity < 1) return NextResponse.json({ ok: false, error: "请填写有效的时段与容量" }, { status: 400 });
  const item = await prisma.ticketSlot.create({ data: { ticketItemId: id, startAt, endAt, capacity, warningThreshold: Math.max(1, Math.min(100, Number(body?.warningThreshold) || 80)) } });
  await invalidateTicketCatalogCache();
  return NextResponse.json({ ok: true, item: slotDto(item) }, { status: 201 });
}
