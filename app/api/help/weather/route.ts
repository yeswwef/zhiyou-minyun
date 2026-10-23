/**
 * @module-note app/api/help/weather/route.ts
 * 福州实况天气与 3 天预报；无 key 或上游异常时返回 degraded=true，前端据此显示"暂不可用"。
 * 台风/暴雨预警本期不实现，本接口不提供任何灾害预警字段。
 */
import { NextRequest, NextResponse } from "next/server";
import { fuzhouWeather } from "@/features/help/amap";
import { ragLog, safeError, withRagLog } from "@/features/rag/logger";

export const runtime = "nodejs";

/** 返回天气快照；?refresh=1 绕过 10 分钟缓存。失败也返回 200 + degraded。 */
export async function GET(req: NextRequest) {
  return withRagLog(async () => {
    const force = req.nextUrl.searchParams.get("refresh") === "1";
    try {
      const weather = await fuzhouWeather(force);
      return NextResponse.json(weather, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      ragLog("help.weather.error", { code: safeError(error) }, "ERROR");
      return NextResponse.json({ ok: false, degraded: true, note: "天气服务暂不可用" });
    }
  });
}
