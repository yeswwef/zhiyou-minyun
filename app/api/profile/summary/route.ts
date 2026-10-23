/**
 * @module-note app/api/profile/summary/route.ts
 * 用户中心／个人统计接口。HTTP请求进入具名方法后执行校验与业务处理，再以响应返回；权限、错误码和数据范围以各分支为准。
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

/**
 * 读取用户中心／个人统计数据，处理对应 GET 请求。
 * 数据库操作：prisma.user.findUnique、prisma.favorite.count、prisma.communityPostFavorite.count、prisma.trip.count、prisma.resourceView.count、prisma.chatSession.count；注意相应的归属过滤与事务边界。
 * 依赖当前会话身份，匿名访问和角色限制由下方分支处理。
 */
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
