/**
 * @module-note app/api/itinerary/share/route.ts
 * 行程分享接口：把 AI 定制路线存成只读快照并返回分享地址。
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { acquire } from "@/features/rag/limits";
import { readBody } from "@/features/rag/http";
import { ragLog, safeError, withRagLog } from "@/features/rag/logger";

export const runtime = "nodejs";

type Stop = { day: number; time: string; name: string; activity: string; note?: string };
type PlanPayload = {
  id: string; theme: string; themeShort: string; title: string; subtitle: string;
  durationDays: number; durationLabel: string; suitable: string; highlight: string;
  routeSummary: string; attractions: string[]; food: string[]; transport: string;
  stops: Stop[]; accent: string; note?: string; cover?: string;
};

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function stringList(value: unknown, max: number, itemMax: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    .slice(0, max)
    .map((item) => item.trim().slice(0, itemMax));
}

/** 只保留渲染需要的字段，避免把任意 JSON 写进分享表。 */
function normalizePlan(value: unknown): PlanPayload | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const title = text(row.title, 80);
  if (!title) return null;

  const rawStops = Array.isArray(row.stops) ? row.stops.slice(0, 60) : [];
  const stops: Stop[] = [];
  for (const entry of rawStops) {
    if (!entry || typeof entry !== "object") continue;
    const stop = entry as Record<string, unknown>;
    const name = text(stop.name, 60);
    if (!name) continue;
    const day = Math.min(10, Math.max(1, Math.floor(Number(stop.day) || 1)));
    const note = text(stop.note, 200);
    stops.push({
      day,
      time: text(stop.time, 20) || "09:00",
      name,
      activity: text(stop.activity, 240),
      ...(note ? { note } : {}),
    });
  }
  if (!stops.length) return null;

  const durationDays = Math.min(10, Math.max(1, Math.floor(Number(row.durationDays) || 1)));
  return {
    id: `shared-${Date.now()}`,
    theme: text(row.theme, 40) || "AI 定制路线",
    themeShort: text(row.themeShort, 10) || "AI",
    title,
    subtitle: text(row.subtitle, 200),
    durationDays,
    durationLabel: text(row.durationLabel, 20) || `${durationDays} 天`,
    suitable: text(row.suitable, 80),
    highlight: text(row.highlight, 120),
    routeSummary: text(row.routeSummary, 400),
    attractions: stringList(row.attractions, 12, 40),
    food: stringList(row.food, 8, 30),
    transport: text(row.transport, 400),
    stops,
    accent: /^#[0-9a-fA-F]{6}$/.test(String(row.accent ?? "")) ? String(row.accent) : "#c05a3e",
    ...(text(row.note, 400) ? { note: text(row.note, 400) } : {}),
    ...(/^\/images\/[\w./-]+$/.test(text(row.cover, 500)) || /^https:\/\/[\w./?=&%:-]+$/.test(text(row.cover, 500))
      ? { cover: text(row.cover, 500) }
      : {}),
  };
}

/** 保存行程快照并返回分享 id。 */
export async function POST(req: NextRequest) {
  return withRagLog(async () => {
    const origin = req.headers.get("origin");
    if (origin && origin !== req.nextUrl.origin) {
      return NextResponse.json({ error: "不接受跨站请求" }, { status: 403 });
    }

    let raw: string;
    try { raw = await readBody(req, 64 * 1024); } catch {
      return NextResponse.json({ error: "行程数据过大" }, { status: 413 });
    }

    let body: { plan?: unknown };
    try { body = JSON.parse(raw) as { plan?: unknown }; } catch {
      return NextResponse.json({ error: "JSON格式错误" }, { status: 400 });
    }

    const plan = normalizePlan(body.plan);
    if (!plan) return NextResponse.json({ error: "行程内容不完整" }, { status: 400 });

    const client = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "guest";
    const release = acquire(`itinerary:share:${client}`);
    if (!release) {
      return NextResponse.json({ error: "创建分享过于频繁，请稍后重试" }, { status: 429, headers: { "Retry-After": "60" } });
    }

    try {
      const shared = await prisma.sharedPlan.create({ data: { plan } });
      ragLog("itinerary.share", { stops: plan.stops.length });
      return NextResponse.json({ ok: true, id: shared.id, url: `/plan?share=${shared.id}` });
    } catch (error) {
      ragLog("itinerary.share.error", { code: safeError(error) }, "ERROR");
      return NextResponse.json({ error: "创建分享链接失败，请稍后重试" }, { status: 500 });
    } finally {
      release();
    }
  });
}
