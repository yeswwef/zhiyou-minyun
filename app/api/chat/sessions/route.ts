/**
 * @module-note app/api/chat/sessions/route.ts
 * AI问答／会话历史接口。HTTP请求进入具名方法后执行校验与业务处理，再以响应返回；权限、错误码和数据范围以各分支为准。
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

/**
 * 读取AI问答／会话历史数据，处理对应 GET 请求。
 * 数据库操作：prisma.chatSession.findMany；注意相应的归属过滤与事务边界。
 * 依赖当前会话身份，匿名访问和角色限制由下方分支处理。
 */
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ data: [], loggedIn: false });
  }

  const sessions = await prisma.chatSession.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { messages: true } } },
  });

  return NextResponse.json({
    data: sessions.map((session) => ({
      id: session.id,
      title: session.title,
      lang: session.lang,
      updatedAt: session.updatedAt.toISOString(),
      messageCount: session._count.messages,
    })),
    loggedIn: true,
  });
}
