/**
 * @module-note app/api/recognition/route.ts
 * AI 多模态识景接口：接收照片 Data URL，返回识别对象与带来源的历史、非遗讲解。
 */
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { recognize } from "@/features/recognition/recognize";
import { acquire } from "@/features/rag/limits";
import { readBody } from "@/features/rag/http";
import { ragLog, safeError, withRagLog } from "@/features/rag/logger";

export const runtime = "nodejs";
export const maxDuration = 180;

/**
 * 处理识景请求；图片与模型调用都在服务端完成，密钥不下发客户端。
 */
export async function POST(req: NextRequest) {
  return withRagLog(async () => {
    const origin = req.headers.get("origin");
    if (origin && origin !== req.nextUrl.origin) {
      return NextResponse.json({ error: "不接受跨站请求" }, { status: 403 });
    }

    let raw: string;
    try {
      raw = await readBody(req, 9 * 1024 * 1024);
    } catch {
      return NextResponse.json({ error: "图片过大或无法读取，请控制在 6MB 以内" }, { status: 413 });
    }

    let body: { image?: unknown };
    try { body = JSON.parse(raw); } catch {
      return NextResponse.json({ error: "JSON格式错误" }, { status: 400 });
    }

    const key = `recognition:${req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "guest"}`;
    const release = acquire(key);
    if (!release) {
      return NextResponse.json({ error: "识别请求过于频繁，请稍后重试" }, { status: 429, headers: { "Retry-After": "60" } });
    }

    try {
      const result = await recognize(body.image as string);
      return NextResponse.json({ requestId: randomUUID(), result });
    } catch (error) {
      const code = error instanceof Error ? error.message : "UNKNOWN";
      if (code === "INVALID_IMAGE" || code === "INVALID_IMAGE_TYPE") {
        return NextResponse.json({ error: "请上传 JPG、PNG 或 WebP 图片" }, { status: 415 });
      }
      if (code === "IMAGE_TOO_LARGE") {
        return NextResponse.json({ error: "图片不能超过 6MB" }, { status: 413 });
      }
      if (code === "MODEL_NOT_CONFIGURED") {
        return NextResponse.json({ error: "识别服务未配置模型" }, { status: 503 });
      }
      if (/^MODEL_HTTP_/.test(code)) {
        return NextResponse.json({ error: "模型服务暂时不可用，请稍后重试" }, { status: 503 });
      }
      if (code === "INVALID_IDENTIFICATION" || code === "INVALID_EXPLANATION") {
        return NextResponse.json({ error: "图片内容暂时无法识别，请换一张主体清晰的照片" }, { status: 422 });
      }
      ragLog("recognition.error", { code: safeError(error) }, "ERROR");
      return NextResponse.json({ error: "识别失败，请稍后重试" }, { status: 500 });
    } finally {
      release();
    }
  });
}
