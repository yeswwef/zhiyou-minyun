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

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ data: [], loggedIn: false });
  }

  const trips = await prisma.trip.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({
    data: trips.map((trip) => ({
      id: trip.id,
      title: trip.title,
      durationDays: trip.durationDays,
      startDate: trip.startDate ? trip.startDate.toISOString() : null,
      items: normalizeItems(trip.items),
      updatedAt: trip.updatedAt.toISOString(),
    })),
    loggedIn: true,
  });
}

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "请先登录" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const title = String(body?.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ ok: false, error: "行程标题不能为空" }, { status: 400 });
  }

  const rawDuration = Number(body?.durationDays);
  const durationDays =
    Number.isFinite(rawDuration) && rawDuration > 0 ? Math.floor(rawDuration) : null;
  const rawDate = body?.startDate ? new Date(String(body.startDate)) : null;
  const startDate = rawDate && !Number.isNaN(rawDate.getTime()) ? rawDate : null;
  const items = normalizeItems(body?.items);

  const trip = await prisma.trip.create({
    data: { userId, title, durationDays, startDate, items },
  });

  return NextResponse.json({
    ok: true,
    trip: {
      id: trip.id,
      title: trip.title,
      durationDays: trip.durationDays,
      items,
    },
  });
}
