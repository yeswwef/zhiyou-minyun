/**
 * @module-note app/api/itinerary/map/image/route.ts
 * 高德静态地图图片代理：由服务端附加密钥取图，浏览器只拿到本站地址与坐标。
 */
import { NextRequest, NextResponse } from "next/server";
import { amapKey, computeView, decodePoints, staticMapQuery } from "@/features/itinerary/geo";
import { ragLog, safeError, withRagLog } from "@/features/rag/logger";

export const runtime = "nodejs";

/** 读取坐标串并返回静态地图图片；坐标非法或上游异常时返回错误响应。 */
export async function GET(req: NextRequest) {
  return withRagLog(async () => {
    const key = amapKey();
    if (!key) return NextResponse.json({ error: "地图服务未配置" }, { status: 503 });

    const raw = req.nextUrl.searchParams.get("p") || "";
    if (raw.length > 1200) return NextResponse.json({ error: "坐标参数过长" }, { status: 400 });

    const points = decodePoints(raw);
    if (!points.length) return NextResponse.json({ error: "坐标参数不合法" }, { status: 400 });

    // 只管底图视野，折线由前端按相邻站点绘制。
    const view = computeView(points);

    try {
      const url = `https://restapi.amap.com/v3/staticmap?key=${key}&${staticMapQuery(view)}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(10000), cache: "no-store" });
      if (!response.ok) throw new Error(`AMAP_HTTP_${response.status}`);

      const type = response.headers.get("content-type") || "";
      if (!type.startsWith("image/")) throw new Error("AMAP_NOT_IMAGE");

      const buffer = await response.arrayBuffer();
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=86400",
        },
      });
    } catch (error) {
      ragLog("itinerary.map.image.error", { code: safeError(error) }, "WARN");
      return NextResponse.json({ error: "地图图片获取失败" }, { status: 502 });
    }
  });
}
