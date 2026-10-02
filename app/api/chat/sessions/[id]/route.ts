import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

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
