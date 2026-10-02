import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

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
