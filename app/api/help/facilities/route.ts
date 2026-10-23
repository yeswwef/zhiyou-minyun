/**
 * @module-note app/api/help/facilities/route.ts
 * 便民设施周边检索：按类型返回距离最近的设施，高德不可用时自动回退内置示例数据。
 */
import { NextRequest, NextResponse } from "next/server";
import { nearbyFacilities } from "@/features/help/amap";
import { FACILITY_TYPES, isValidCoordinate, type FacilityType } from "@/features/help/types";
import { acquire } from "@/features/rag/limits";
import { ragLog, safeError, withRagLog } from "@/features/rag/logger";

export const runtime = "nodejs";

/** 处理周边设施查询；校验类型与坐标后交给适配层。 */
export async function GET(req: NextRequest) {
  return withRagLog(async () => {
    const params = req.nextUrl.searchParams;
    const type = (params.get("type") || "").toUpperCase();
    const lat = Number(params.get("lat"));
    const lng = Number(params.get("lng"));
    // 半径限制在 500m~5000m，避免被当成自由参数滥用高德配额。
    const radius = Math.min(5000, Math.max(500, Number(params.get("radius")) || 2000));

    if (!FACILITY_TYPES.includes(type as FacilityType)) {
      return NextResponse.json({ error: "设施类型不合法" }, { status: 400 });
    }
    if (!isValidCoordinate(lat, lng)) {
      return NextResponse.json({ error: "坐标不合法，请重新定位" }, { status: 400 });
    }

    const client = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "guest";
    const release = acquire(`help:facilities:${client}`);
    if (!release) {
      return NextResponse.json({ error: "查询过于频繁，请稍后重试" }, { status: 429, headers: { "Retry-After": "30" } });
    }

    try {
      const result = await nearbyFacilities(type as FacilityType, lat, lng, radius, 12);
      return NextResponse.json({
        source: result.source,
        type,
        count: result.items.length,
        items: result.items,
        ...(result.note ? { note: result.note } : {}),
      }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      ragLog("help.facilities.error", { code: safeError(error) }, "ERROR");
      return NextResponse.json({ error: "设施查询失败，请稍后重试" }, { status: 500 });
    } finally {
      release();
    }
  });
}
