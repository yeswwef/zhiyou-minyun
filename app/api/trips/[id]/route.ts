import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

type TripItem = { resourceId: string; title: string; day?: number };

function normalizeItems(value: unknown): TripItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      resourceId: String(item.resourceId ?? ""),
      title: String(item.title ?? ""),
      day: typeof item.day === "number" ? item.day : undefined,
    }))
    .filter((item) => item.resourceId);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "请先登录" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.trip.findFirst({ where: { id, userId } });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "行程不存在" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);

  const title = typeof body?.title === "string" ? body.title.trim() : null;
  const hasDuration = body?.durationDays !== undefined;
  const durationDays = hasDuration
    ? (() => {
        const raw = Number(body.durationDays);
        return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : null;
      })()
    : undefined;
  const hasStart = body?.startDate !== undefined;
  const startDate = hasStart
    ? (() => {
        const raw = body.startDate ? new Date(String(body.startDate)) : null;
        return raw && !Number.isNaN(raw.getTime()) ? raw : null;
      })()
    : undefined;
  const items = body?.items !== undefined ? normalizeItems(body.items) : undefined;

  const updated = await prisma.trip.update({
    where: { id },
    data: {
      ...(title ? { title } : {}),
      ...(hasDuration ? { durationDays } : {}),
      ...(hasStart ? { startDate } : {}),
      ...(items !== undefined ? { items } : {}),
    },
  });

  return NextResponse.json({
    ok: true,
    trip: {
      id: updated.id,
      title: updated.title,
      durationDays: updated.durationDays,
      items: normalizeItems(updated.items),
    },
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "请先登录" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.trip.findFirst({ where: { id, userId } });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "行程不存在" }, { status: 404 });
  }

  await prisma.trip.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
