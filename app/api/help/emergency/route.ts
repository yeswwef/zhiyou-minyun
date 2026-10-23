/**
 * @module-note app/api/help/emergency/route.ts
 * 一键求助：登记工单并返回就近医疗点电话。
 * 不接入公安或急救调度系统，响应里带固定免责声明。
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createEmergency } from "@/features/help/emergency";
import { EMERGENCY_KINDS, isValidCoordinate, type EmergencyKind } from "@/features/help/types";
import { acquire } from "@/features/rag/limits";
import { readBody } from "@/features/rag/http";
import { ragLog, safeError, withRagLog } from "@/features/rag/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

/** 创建求助工单；匿名可用，登录用户会记录 userId 便于后台跟进。 */
export async function POST(req: NextRequest) {
  return withRagLog(async () => {
    const origin = req.headers.get("origin");
    if (origin && origin !== req.nextUrl.origin) {
      return NextResponse.json({ error: "不接受跨站请求" }, { status: 403 });
    }

    let raw: string;
    try {
      raw = await readBody(req, 8000);
    } catch {
      return NextResponse.json({ error: "请求过大" }, { status: 413 });
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "JSON格式错误" }, { status: 400 });
    }

    const kind = String(body.kind || "").toUpperCase();
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    const accuracy = body.accuracy === undefined ? undefined : Number(body.accuracy);
    const note = typeof body.note === "string" ? body.note.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";

    if (!EMERGENCY_KINDS.includes(kind as EmergencyKind)) {
      return NextResponse.json({ error: "求助类型不合法" }, { status: 400 });
    }
    if (!isValidCoordinate(lat, lng)) {
      return NextResponse.json({ error: "缺少有效位置，请允许定位后重试" }, { status: 400 });
    }
    if (note.length > 500) {
      return NextResponse.json({ error: "补充说明请控制在 500 字以内" }, { status: 400 });
    }
    if (phone && !/^[0-9+\-\s]{5,30}$/.test(phone)) {
      return NextResponse.json({ error: "联系电话格式不正确" }, { status: 400 });
    }

    // 求助属于低频但高优先的操作，限流放宽到 10 分钟 5 次，避免误触被封。
    const client = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "guest";
    const release = acquire(`help:emergency:${client}`);
    if (!release) {
      return NextResponse.json(
        { error: "提交过于频繁，请稍后重试或直接拨打 110 / 120" },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }

    try {
      // 登录状态不影响求助可用性；拿不到就按匿名处理。
      const user = await getSessionUser().catch(() => null);
      const result = await createEmergency(
        {
          kind: kind as EmergencyKind,
          lat,
          lng,
          accuracy: Number.isFinite(accuracy) ? accuracy : undefined,
          note: note || undefined,
          phone: phone || undefined,
        },
        user?.id ?? null,
      );
      return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      ragLog("help.emergency.error", { code: safeError(error) }, "ERROR");
      return NextResponse.json({ error: "工单提交失败，请直接拨打 110 / 120" }, { status: 503 });
    } finally {
      release();
    }
  });
}
