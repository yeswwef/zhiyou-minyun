import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ user: null, loggedIn: false });
  }

  const [user, favorites, trips, views, chatSessions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        nickname: true,
        role: true,
        createdAt: true,
      },
    }),
    prisma.favorite.count({ where: { userId } }),
    prisma.trip.count({ where: { userId } }),
    prisma.resourceView.count({ where: { userId } }),
    prisma.chatSession.count({ where: { userId } }),
  ]);

  return NextResponse.json({
    user,
    loggedIn: true,
    counts: { favorites, trips, views, chatSessions },
  });
}
