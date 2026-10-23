/**
 * @module-note app/api/trips/route.ts
 * 旅行计划接口。HTTP请求进入具名方法后执行校验与业务处理，再以响应返回；权限、错误码和数据范围以各分支为准。
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { guardVisitor } from "@/lib/roles";

type TripItem = { resourceId: string; title: string; day?: number };

/**
 * 将外部传入的行程条目整理为受支持的资源结构。
 * 输入：value；类型与可选项见函数签名。
 */
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

/**
 * 读取旅行计划数据，处理对应 GET 请求。
 * 数据库操作：prisma.trip.findMany；注意相应的归属过滤与事务边界。
 * 依赖当前会话身份，匿名访问和角色限制由下方分支处理。
 */
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

/**
 * 提交或创建旅行计划数据，处理对应 POST 请求。
 * 数据库操作：prisma.trip.create；注意相应的归属过滤与事务边界。
 * 访问前执行游客角色检查，失败直接返回拒绝响应。
 */
export async function POST(request: NextRequest) {
  const guard = await guardVisitor();
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

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
