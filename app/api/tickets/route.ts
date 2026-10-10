import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { slotDto } from "@/features/tickets/data";
import {
  CacheRebuildBusyError,
  consumeTicketRateLimit,
  getOrLoadTicketCache,
  requestFingerprint,
  ticketListCacheKey,
} from "@/features/tickets/resilience";

const venueTypes = ["SCENIC", "MUSEUM", "PERFORMANCE"] as const;

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q")?.trim() ?? "").slice(0, 50);
  const requestedType = request.nextUrl.searchParams.get("type")?.trim() ?? "";
  if (requestedType && !venueTypes.includes(requestedType as (typeof venueTypes)[number])) {
    return NextResponse.json({ ok: false, error: "无效的票务类型" }, { status: 400 });
  }
  const type = requestedType as "" | (typeof venueTypes)[number];
  const rate = await consumeTicketRateLimit(`list:${requestFingerprint(request)}`, 120, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, error: "访问过于频繁，请稍后重试" },
      { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil(rate.retryAfterMs / 1_000))) } },
    );
  }

  try {
    const cached = await getOrLoadTicketCache({
      key: ticketListCacheKey(q, type),
      freshTtlMs: 5_000,
      staleTtlMs: 45_000,
      negativeTtlMs: 12_000,
      isNegative: (value) => Array.isArray(value) && value.length === 0,
      loader: async () => {
        const tickets = await prisma.ticketItem.findMany({
          where: {
            status: "OPEN",
            venue: { enabled: true, ...(type ? { type } : {}) },
            ...(q ? { OR: [{ title: { contains: q } }, { venue: { name: { contains: q } } }] } : {}),
          },
          include: {
            venue: true,
            slots: { where: { status: "OPEN", startAt: { gt: new Date() } }, orderBy: { startAt: "asc" }, take: 4 },
          },
          orderBy: { updatedAt: "desc" },
        });
        return tickets.map((ticket) => ({ ...ticket, slots: ticket.slots.map(slotDto) }));
      },
    });
    return NextResponse.json(
      { ok: true, data: cached.value ?? [] },
      { headers: { "X-Ticket-Cache": cached.state, "Cache-Control": "public, max-age=2, stale-while-revalidate=30" } },
    );
  } catch (error) {
    if (error instanceof CacheRebuildBusyError) {
      return NextResponse.json({ ok: false, error: "票务数据正在刷新，请稍后重试" }, { status: 503, headers: { "Retry-After": "1" } });
    }
    throw error;
  }
}
