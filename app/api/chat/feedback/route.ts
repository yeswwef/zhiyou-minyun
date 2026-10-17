/**
 * @module-note app/api/chat/feedback/route.ts
 * AI问答／回答反馈接口。HTTP请求进入具名方法后执行校验与业务处理，再以响应返回；权限、错误码和数据范围以各分支为准。
 */
import { NextRequest, NextResponse } from "next/server";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { config } from "@/features/rag/config";
import { acquire } from "@/features/rag/limits";
import { readBody } from "@/features/rag/http";

/**
 * 提交或创建AI问答／回答反馈数据，处理对应 POST 请求。
 * 数据库操作：prisma.chatSession.findFirst；注意相应的归属过滤与事务边界。
 * 依赖当前会话身份，匿名访问和角色限制由下方分支处理。
 */
export async function POST(req: NextRequest) {
  if (req.headers.get("origin") && req.headers.get("origin") !== req.nextUrl.origin) return NextResponse.json({ error: "禁止跨站请求" }, { status: 403 });
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "登录后可保存反馈" }, { status: 401 });
    let raw: string;
    try { raw = await readBody(req, 2000); } catch { return NextResponse.json({ error: "请求过大或无法读取" }, { status: 413 }); }
    if (raw.length > 1000) return NextResponse.json({ error: "请求过大" }, { status: 413 });
    const body = JSON.parse(raw);
    if (!body || typeof body.sessionId !== "string" || body.sessionId.length > 100 || typeof body.requestId !== "string" ||
      !/^[a-f0-9-]{36}$/.test(body.requestId) || !["up", "down"].includes(body.rating)) return NextResponse.json({ error: "无效反馈" }, { status: 400 });
    const release = acquire(`feedback:${user.id}`);
    if (!release) return NextResponse.json({ error: "请稍后再试" }, { status: 429 });
    try {
      const session = await prisma.chatSession.findFirst({ where: { id: body.sessionId, userId: user.id }, include: { messages: { where: { role: "assistant" }, select: { citations: true } } } });
      if (!session || !session.messages.some((m) => (m.citations as { requestId?: string } | null)?.requestId === body.requestId)) return NextResponse.json({ error: "回答不存在" }, { status: 404 });
      await mkdir(config().dataDir, { recursive: true });
      await appendFile(path.join(config().dataDir, "feedback.jsonl"), JSON.stringify({ requestId: body.requestId, rating: body.rating, time: new Date().toISOString() }) + "\n");
      return NextResponse.json({ ok: true });
    } finally { release(); }
  } catch { return NextResponse.json({ error: "反馈保存失败" }, { status: 503 }); }
}
