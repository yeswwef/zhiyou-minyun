/**
 * @module-note app/api/itinerary/map/route.ts
 * 行程地图数据接口：把站点名解析为真实坐标，返回标注点、静态地图代理地址与全程导航链接。
 */
import { NextRequest, NextResponse } from "next/server";
import {
  amapKey, computeView, encodePoints, markerUrl, navigationUrl, projectPoints, resolveStops,
} from "@/features/itinerary/geo";
import { acquire } from "@/features/rag/limits";
import { readBody } from "@/features/rag/http";
import { ragLog, safeError, withRagLog } from "@/features/rag/logger";

export const runtime = "nodejs";

/** 只接受 name/day 两个字段，且限制条数，避免把站点列表当自由参数。 */
function normalizeStops(value: unknown): { name: string; day: number }[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .slice(0, 40)
    .map((item) => ({
      name: typeof item.name === "string" ? item.name.trim().slice(0, 60) : "",
      day: Math.min(10, Math.max(1, Math.floor(Number(item.day) || 1))),
    }))
    .filter((item) => item.name);
}

/** 处理行程地图解析请求。 */
export async function POST(req: NextRequest) {
  return withRagLog(async () => {
    const origin = req.headers.get("origin");
    if (origin && origin !== req.nextUrl.origin) {
      return NextResponse.json({ error: "不接受跨站请求" }, { status: 403 });
    }

    let raw: string;
    try { raw = await readBody(req, 16 * 1024); } catch {
      return NextResponse.json({ error: "请求过大或无法读取" }, { status: 413 });
    }

    let body: { stops?: unknown };
    try { body = JSON.parse(raw) as { stops?: unknown }; } catch {
      return NextResponse.json({ error: "JSON格式错误" }, { status: 400 });
    }

    const stops = normalizeStops(body.stops);
    if (!stops.length) return NextResponse.json({ error: "请提供行程站点" }, { status: 400 });

    if (!amapKey()) {
      return NextResponse.json({
        available: false, points: [], missing: [], distanceKm: 0,
        note: "未配置高德 key，路线图使用示意图",
      });
    }

    const client = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "guest";
    const release = acquire(`itinerary:map:${client}`);
    if (!release) {
      return NextResponse.json({ error: "地图解析过于频繁，请稍后重试" }, { status: 429, headers: { "Retry-After": "30" } });
    }

    try {
      const { points, missing, distanceKm } = await resolveStops(stops);
      ragLog("itinerary.map", { stops: stops.length, points: points.length, missing: missing.length });

      if (!points.length) {
        return NextResponse.json({
          available: false, points: [], missing, distanceKm: 0,
          note: "没有解析到可定位的站点，路线图使用示意图",
        });
      }

      return NextResponse.json({
        available: true,
        points: projectPoints(points, computeView(points)).map((point) => ({
          ...point, markerUrl: markerUrl(point),
        })),
        imageUrl: `/api/itinerary/map/image?p=${encodeURIComponent(encodePoints(points))}`,
        navigationUrl: navigationUrl(points),
        distanceKm,
        missing,
        note: missing.length ? `${missing.length} 个站点未能定位，已在地图上跳过` : "",
      }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      ragLog("itinerary.map.error", { code: safeError(error) }, "ERROR");
      return NextResponse.json({
        available: false, points: [], missing: [], distanceKm: 0,
        note: "地图服务暂不可用，路线图使用示意图",
      });
    } finally {
      release();
    }
  });
}
