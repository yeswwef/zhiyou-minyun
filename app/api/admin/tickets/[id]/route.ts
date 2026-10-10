import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { guardAdmin } from "@/lib/roles";
import { invalidateTicketCatalogCache } from "@/features/tickets/resilience";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const guard = await guardAdmin(); if (!guard.ok) return guard.response;
  const { id } = await context.params; const body = await request.json().catch(() => null);
  const allowed = ["DRAFT", "OPEN", "PAUSED", "CLOSED"];
  const item = await prisma.ticketItem.update({ where: { id }, data: { ...(body?.status && allowed.includes(body.status) ? { status: body.status } : {}), ...(body?.title ? { title: String(body.title).trim() } : {}) } });
  await invalidateTicketCatalogCache();
  return NextResponse.json({ ok: true, item });
}
