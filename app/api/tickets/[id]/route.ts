import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { slotDto } from "@/features/tickets/data";
import {
  CacheRebuildBusyError,
  consumeTicketRateLimit,
  getOrLoadTicketCache,
  requestFingerprint,
  ticketDetailCacheKey,
} from "@/features/tickets/resilience";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(id)) {
    return NextResponse.json({ ok: false, error: "无效的票务项目编号" }, { status: 400 });
  }
  const rate = await consumeTicketRateLimit(`detail:${requestFingerprint(request)}`, 180, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, error: "访问过于频繁，请稍后重试" },
      { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil(rate.retryAfterMs / 1_000))) } },
    );
  }

  try {
    const cached = await getOrLoadTicketCache({
      key: ticketDetailCacheKey(id),
      freshTtlMs: 3_000,
      staleTtlMs: 30_000,
      negativeTtlMs: 20_000,
      loader: async () => {
        const ticket = await prisma.ticketItem.findFirst({
          where: { id, status: "OPEN", venue: { enabled: true } },
          include: {
            venue: true,
            slots: { where: { status: "OPEN", startAt: { gt: new Date() } }, orderBy: { startAt: "asc" } },
          },
        });
        return ticket ? { ...ticket, slots: ticket.slots.map(slotDto) } : null;
      },
    });
    if (!cached.value) {
      return NextResponse.json({ ok: false, error: "票务项目不存在或未开放" }, { status: 404, headers: { "X-Ticket-Cache": cached.state } });
    }
    return NextResponse.json(
      { ok: true, item: cached.value },
      { headers: { "X-Ticket-Cache": cached.state, "Cache-Control": "public, max-age=1, stale-while-revalidate=20" } },
    );
  } catch (error) {
    if (error instanceof CacheRebuildBusyError) {
      return NextResponse.json({ ok: false, error: "票务数据正在刷新，请稍后重试" }, { status: 503, headers: { "Retry-After": "1" } });
    }
    throw error;
  }
}
