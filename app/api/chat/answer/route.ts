/**
 * @module-note app/api/chat/answer/route.ts
 * AI问答／回答生成接口。HTTP请求进入具名方法后执行校验与业务处理，再以响应返回；权限、错误码和数据范围以各分支为准。
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { answerQuestion, requestId } from "@/features/rag/pipeline";
import { acquire } from "@/features/rag/limits";
import { generateFollowUps } from "@/features/rag/followups";
import { readBody } from "@/features/rag/http";
import type { Message } from "@/features/rag/types";
import type { AnswerEvent } from "@/features/rag/stream";
import { withRagLog, logContext, ragLog, safeError } from "@/features/rag/logger";

export const runtime = "nodejs";
export const maxDuration = 180;

/**
 * 提交或创建AI问答／回答生成数据，处理对应 POST 请求。
 */
export async function POST(req: NextRequest) {
  return withRagLog(async () => {
    ragLog("request.start", { streaming: req.headers.get("accept")?.includes("text/event-stream") ?? false });
    try {
      const response = await handleRequest(req);
      ragLog("request.validate", { status: response.status, accepted: response.ok });
      if (!response.ok) ragLog("request.rejected", { status: response.status }, "WARN");
      return response;
    } catch(error) { ragLog("request.error",{code:safeError(error)},"ERROR"); throw error; }
  });
}
/**
 * 校验问答请求及身份，选择普通 JSON 或 SSE 响应通道。
 * 数据库操作：prisma.chatSession.findFirst、prisma.$transaction、tx.chatSession.update、tx.chatSession.create、tx.chatMessage.create；注意相应的归属过滤与事务边界。
 * 依赖当前会话身份，匿名访问和角色限制由下方分支处理。
 * 输入：req；类型与可选项见函数签名。
 */
async function handleRequest(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "不接受跨站请求" }, { status: 403 });
  let raw: string;
  try { raw = await readBody(req, 16000); } catch { return NextResponse.json({ error: "请求过大或无法读取" }, { status: 413 }); }
  if (raw.length > 5000) return NextResponse.json({ error: "请求过大" }, { status: 413 });
  let body: { question?: unknown; sessionId?: unknown; language?: unknown; category?: unknown };
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "JSON格式错误" }, { status: 400 }); }
  if (!body || typeof body.question !== "string" || !body.question.trim() || body.question.length > 1000 ||
    (body.sessionId !== undefined && (typeof body.sessionId !== "string" || body.sessionId.length > 100)) ||
    (body.language !== undefined && !["zh", "en"].includes(String(body.language))) ||
    (body.category !== undefined && (typeof body.category !== "string" || !/^(0[1-9]|10)$/.test(body.category))))
    return NextResponse.json({ error: "问题或筛选条件不合法" }, { status: 400 });
  let user: Awaited<ReturnType<typeof getSessionUser>>;
  try { user = await getSessionUser(); } catch { return NextResponse.json({ error: "登录服务不可用，请稍后重试" }, { status: 503 }); }
  // Anonymous use is local-development only; all production calls require an authenticated user.
  if (!user && (process.env.NODE_ENV === "production" || body.sessionId)) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const release = acquire(user?.id ?? "development-guests");
  if (!release) return NextResponse.json({ error: "提问过于频繁，请稍后重试" }, { status: 429, headers: { "Retry-After": "60" } });
  // 取消浏览器响应时中止联网请求，避免页面关闭后仍继续消耗搜索额度。
  const cancellation = new AbortController();
  const requestSignal = AbortSignal.any([req.signal, cancellation.signal]);
  /**
   * 读取会话上下文、执行问答、保存消息并发送最终结果。
   * 数据库操作：prisma.chatSession.findFirst、prisma.$transaction、tx.chatSession.update、tx.chatSession.create、tx.chatMessage.create；注意相应的归属过滤与事务边界。
   * 输入：emit；类型与可选项见函数签名。
   */
  async function execute(emit?: (event: AnswerEvent) => void) {
  try {
    const id = logContext()?.id ?? requestId();
    ragLog("question.received", { length: (body.question as string).length, language: body.language || "zh", authenticated: Boolean(user) });
    ragLog("question.debug", { question: body.question }, "DEBUG");
    let sessionId = typeof body.sessionId === "string" ? body.sessionId : undefined;
    const history: Message[] = [];
    const historyStart=Date.now();
    if (sessionId) {
      const session = await prisma.chatSession.findFirst({ where: { id: sessionId, userId: user!.id },
        include: { messages: { orderBy: { createdAt: "desc" }, take: 6 } } });
      if (!session) { ragLog("history.denied",{},"WARN"); return NextResponse.json({ error: "会话不存在" }, { status: 404 }); }
      for (const message of session.messages.reverse()) if (message.role === "user" || message.role === "assistant") history.push({ role: message.role, content: message.content });
    }
    ragLog("history.load",{count:history.length,durationMs:Date.now()-historyStart});
    const answer = await answerQuestion((body.question as string).trim(), history, body.language === "en" ? "en" : "zh", body.category as string | undefined, undefined, emit, requestSignal);
    requestSignal.throwIfAborted();
    // 正文已通过流式事件发送；推荐追问与正文一起保存，重开历史无需再次调用模型。
    const followUpStart = Date.now();
    emit?.({ type: "status", text: body.language === "en" ? "Preparing follow-up questions" : "正在生成推荐追问" });
    answer.followUpQuestions = await generateFollowUps(body.question as string, answer, body.language === "en" ? "en" : "zh");
    requestSignal.throwIfAborted();
    const followUpMs = Date.now() - followUpStart;
    answer.trace.elapsedMs += followUpMs;
    answer.trace.stages = [...(answer.trace.stages ?? []), { name: "followups", elapsedMs: followUpMs }];
    let persisted = false;
    const saveStart=Date.now();
    if (user) {
      try {
        sessionId = await prisma.$transaction(async (tx) => {
          const session = sessionId ? await tx.chatSession.update({ where: { id: sessionId }, data: { updatedAt: new Date() } }) :
            await tx.chatSession.create({ data: { userId: user.id, title: body.question!.toString().slice(0, 60), lang: body.language === "en" ? "en" : "zh" } });
          await tx.chatMessage.create({ data: { sessionId: session.id, role: "user", content: body.question as string } });
          await tx.chatMessage.create({ data: { sessionId: session.id, role: "assistant", content: JSON.stringify(answer),
            citations: JSON.parse(JSON.stringify({ requestId: id, sources: answer.sources, webSources: answer.webSources ?? [] })), latencyMs: answer.trace.elapsedMs } });
          return session.id;
        });
        persisted = true;
      } catch { ragLog("history.save.failed",{durationMs:Date.now()-saveStart},"WARN"); answer.trace.warnings.push("回答已生成，但会话历史保存失败"); }
    }
    ragLog("history.save",{persisted,skipped:!user,durationMs:Date.now()-saveStart});
    ragLog("answer.complete",{mode:answer.mode,sources:answer.sources.length,firstTextMs:answer.trace.firstTextMs,durationMs:answer.trace.elapsedMs,version:answer.trace.version,dense:answer.trace.retrieval?.dense,reranked:answer.trace.retrieval?.reranked});
    return NextResponse.json({ answer, requestId: id, sessionId: persisted ? sessionId : undefined, persisted }, { headers: { "Cache-Control": "no-store" } });
  } catch(error) { ragLog("request.error",{code:safeError(error)},"ERROR"); return NextResponse.json({ error: "问答服务暂不可用，请稍后重试" }, { status: 503 }); }
  finally { release!(); }
  }
  if (!req.headers.get("accept")?.includes("text/event-stream")) { const response=await execute(); ragLog("request.complete",{status:response.status}); return response; }
  let disconnected = false;
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    /**
     * 初始化流控制器并开始产生数据事件。
     * 输入：controller；类型与可选项见函数签名。
     */
    async start(controller) {
      ragLog("stream.open"); let count=0, characters=0, first=false;
      /**
       * 发送当前问题或数据事件并处理接收结果。
       * 输入：event；类型与可选项见函数签名。
       */
      const send = (event: unknown) => {
        if (disconnected) return;
        const e=event as {type:string;text?:string};
        if ((e.type==="delta"||e.type==="replace")&&e.text?.trim()) {
          if(!first){first=true;ragLog("stream.first_text");}
          characters+=e.text.length;
        }
        count++; controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      const heartbeat = setInterval(() => { if (!disconnected) controller.enqueue(encoder.encode(": heartbeat\n\n")); }, 10000);
      try {
        send({ type: "status", text: "正在准备回答…" });
        const response = await execute(send);
        const payload = await response.json();
        send(response.ok ? { type: "done", ...payload } : { type: "error", text: payload.error || "问答服务暂不可用" });
      } catch(error) { ragLog("stream.error",{code:safeError(error)},"ERROR"); send({ type: "error", text: "流式回答中断，请重试" }); }
      finally { clearInterval(heartbeat); ragLog("stream.complete",{disconnected,events:count,emittedCharacters:characters}); ragLog("request.complete",{disconnected}); if (!disconnected) controller.close(); }
    },
    /**
     * 提交取消操作并更新当前页面状态。
     */
    cancel() { disconnected = true; cancellation.abort(); ragLog("stream.disconnect",{},"WARN"); },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" } });
}
