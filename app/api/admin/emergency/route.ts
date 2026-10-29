﻿/**
 * @module-note app/api/admin/emergency/route.ts
 * 平台管理中心：便民应急工单查询与处置接口。
 */
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { guardTicketAdmin } from "@/lib/roles";

const STATUSES = ["pending", "handled", "closed"] as const;
type EmergencyStatus = (typeof STATUSES)[number];

/** 查询全部应急求助工单。 */
export async function GET() {
  const guard = await guardTicketAdmin();
  if (!guard.ok) return guard.response;

  const [data, groups] = await Promise.all([
    prisma.emergencyRequest.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.emergencyRequest.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const stats = { pending: 0, handled: 0, closed: 0 } as Record<EmergencyStatus, number>;
  for (const group of groups) {
    if (STATUSES.includes(group.status as EmergencyStatus)) stats[group.status as EmergencyStatus] = group._count._all;
  }
  return NextResponse.json({ ok: true, data, stats });
}

/** 标记工单为已处理或已关闭。 */
export async function PATCH(req: NextRequest) {
  const guard = await guardTicketAdmin();
  if (!guard.ok) return guard.response;

  let body: { id?: unknown; status?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "请求格式错误" }, { status: 400 }); }
  const id = typeof body.id === "string" ? body.id : "";
  const status = typeof body.status === "string" && STATUSES.includes(body.status as EmergencyStatus)
    ? (body.status as EmergencyStatus) : null;
  if (!id || !status) return NextResponse.json({ ok: false, error: "工单或状态不合法" }, { status: 400 });

  const data = await prisma.emergencyRequest.update({
    where: { id },
    data: { status, ...(status === "handled" ? { handledAt: new Date() } : {}) },
    select: { id: true, status: true, handledAt: true },
  });
  revalidatePath("/admin/emergency");
  return NextResponse.json({ ok: true, data });
}

