import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ user: null, loggedIn: false });
  }

  const [user, resourceFavorites, communityFavorites, trips, views, chatSessions, following, followers] = await Promise.all([
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
    prisma.communityPostFavorite.count({ where: { userId } }),
    prisma.trip.count({ where: { userId } }),
    prisma.resourceView.count({ where: { userId } }),
    prisma.chatSession.count({ where: { userId } }),
    prisma.userFollow.count({ where: { followerId: userId } }),
    prisma.userFollow.count({ where: { followingId: userId } }),
  ]);

  return NextResponse.json({
    user,
    loggedIn: true,
    counts: {
      favorites: resourceFavorites + communityFavorites,
      resourceFavorites,
      communityFavorites,
      trips,
      views,
      chatSessions,
      following,
      followers,
    },
  });
}
