/**
 * @module-note app/api/chat/sessions/[id]/route.ts
 * AI问答／会话历史／指定id接口。HTTP请求进入具名方法后执行校验与业务处理，再以响应返回；权限、错误码和数据范围以各分支为准。
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

/**
 * 读取AI问答／会话历史／指定id数据，处理对应 GET 请求。
 * 数据库操作：prisma.chatSession.findFirst；注意相应的归属过滤与事务边界。
 * 依赖当前会话身份，匿名访问和角色限制由下方分支处理。
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "请先登录" }, { status: 401 });
  }

  const { id } = await params;
  const session = await prisma.chatSession.findFirst({
    where: { id, userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!session) {
    return NextResponse.json({ ok: false, error: "会话不存在" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    session: {
      id: session.id,
      title: session.title,
      messages: session.messages.map((message) => ({
        role: message.role,
        content: message.content,
        citations: message.citations,
        createdAt: message.createdAt.toISOString(),
      })),
    },
  });
}
