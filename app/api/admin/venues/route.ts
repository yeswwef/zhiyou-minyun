import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { guardAdmin } from "@/lib/roles";
import { invalidateTicketCatalogCache } from "@/features/tickets/resilience";

export async function GET() {
  const guard = await guardAdmin(); if (!guard.ok) return guard.response;
  const data = await prisma.venue.findMany({ include: { _count: { select: { tickets: true } } }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ ok: true, data });
}

export async function POST(request: NextRequest) {
  const guard = await guardAdmin(); if (!guard.ok) return guard.response;
  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? "").trim(); const address = String(body?.address ?? "").trim();
  if (!name || !address || !["SCENIC", "MUSEUM", "PERFORMANCE"].includes(body?.type)) return NextResponse.json({ ok: false, error: "请完整填写场馆信息" }, { status: 400 });
  const item = await prisma.venue.create({ data: { name, address, type: body.type, contact: body.contact || null, image: body.image || null } });
  await invalidateTicketCatalogCache();
  return NextResponse.json({ ok: true, item }, { status: 201 });
}
