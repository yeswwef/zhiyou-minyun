/**
 * @module-note app/api/admin/ai/route.ts
 * 平台管理中心：AI 问答运营数据（只读）接口。
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { guardAdmin } from "@/lib/roles";

const MODE_LABELS: Record<string, string> = {
  rag: "本地知识库",
  web: "联网补充",
  model: "模型回答",
  extractive: "本地摘录",
  general: "寒暄",
  refused: "拒答",
};

/** 汇总问答会话、消息、耗时与回答模式，并返回最近会话与提问。 */
export async function GET() {
  const guard = await guardAdmin();
  if (!guard.ok) return guard.response;

  const [sessionCount, messageCount, latency, recentSessions, questions, samples] = await Promise.all([
    prisma.chatSession.count(),
    prisma.chatMessage.count(),
    prisma.chatMessage.aggregate({ _avg: { latencyMs: true }, where: { role: "assistant" } }),
    prisma.chatSession.findMany({
      take: 12,
      orderBy: { updatedAt: "desc" },
      include: {
        user: { select: { username: true, nickname: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 2, select: { role: true, content: true, createdAt: true, latencyMs: true } },
        _count: { select: { messages: true } },
      },
    }),
    prisma.chatMessage.findMany({
      where: { role: "user" },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true, content: true, createdAt: true,
        session: { select: { user: { select: { username: true, nickname: true } } } },
      },
    }),
    prisma.chatMessage.findMany({
      where: { role: "assistant" },
      orderBy: { createdAt: "desc" },
      take: 300,
      select: { content: true },
    }),
  ]);

  const modes: Record<string, number> = {};
  for (const row of samples) {
    try {
      const data = JSON.parse(row.content) as { mode?: unknown };
      if (typeof data?.mode === "string") modes[data.mode] = (modes[data.mode] ?? 0) + 1;
    } catch {
      // 纯文本回答不计入模式统计。
    }
  }
  const modeStats = Object.entries(modes)
    .map(([mode, count]) => ({ mode, label: MODE_LABELS[mode] ?? mode, count }))
    .sort((a, b) => b.count - a.count);

  const sessions = recentSessions.map((session) => ({
    ...session,
    messages: [...session.messages].reverse(),
  }));

  return NextResponse.json({
    ok: true,
    stats: {
      sessions: sessionCount,
      messages: messageCount,
      avgLatency: Math.round(latency._avg.latencyMs ?? 0),
      samples: samples.length,
    },
    modes: modeStats,
    sessions,
    questions,
  });
}
