/**
 * @module-note app/api/trips/[id]/route.ts
 * 旅行计划／指定id接口。HTTP请求进入具名方法后执行校验与业务处理，再以响应返回；权限、错误码和数据范围以各分支为准。
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
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
 * 局部更新旅行计划／指定id数据，处理对应 PATCH 请求。
 * 数据库操作：prisma.trip.findFirst、prisma.trip.update；注意相应的归属过滤与事务边界。
 * 访问前执行游客角色检查，失败直接返回拒绝响应。
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardVisitor();
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

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

/**
 * 删除或取消旅行计划／指定id数据，处理对应 DELETE 请求。
 * 数据库操作：prisma.trip.findFirst、prisma.trip.delete；注意相应的归属过滤与事务边界。
 * 访问前执行游客角色检查，失败直接返回拒绝响应。
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardVisitor();
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const { id } = await params;
  const existing = await prisma.trip.findFirst({ where: { id, userId } });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "行程不存在" }, { status: 404 });
  }

  await prisma.trip.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
