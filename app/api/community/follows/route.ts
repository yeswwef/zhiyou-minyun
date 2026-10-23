/**
 * @module-note app/api/community/follows/route.ts
 * 社区／关注关系接口。HTTP请求进入具名方法后执行校验与业务处理，再以响应返回；权限、错误码和数据范围以各分支为准。
 */
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { guardVisitor } from "@/lib/roles";
import { prisma } from "@/lib/db";

const userSelect = {
  id: true,
  username: true,
  nickname: true,
  _count: { select: { followers: true, communityPosts: true } },
} as const;

/**
 * 读取社区／关注关系数据，处理对应 GET 请求。
 * 数据库操作：prisma.userFollow.findMany；注意相应的归属过滤与事务边界。
 * 依赖当前会话身份，匿名访问和角色限制由下方分支处理。
 */
export async function GET(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "请先登录", data: [] }, { status: 401 });
  }
  const mode = request.nextUrl.searchParams.get("mode") === "followers" ? "followers" : "following";

  if (mode === "following") {
    const rows = await prisma.userFollow.findMany({
      where: { followerId: userId },
      include: { following: { select: userSelect } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({
      ok: true,
      data: rows.map((row) => ({ ...row.following, followedByMe: true, followedAt: row.createdAt.toISOString() })),
    });
  }

  const rows = await prisma.userFollow.findMany({
    where: { followingId: userId },
    include: { follower: { select: userSelect } },
    orderBy: { createdAt: "desc" },
  });
  const followerIds = rows.map((row) => row.followerId);
  const followedBack = await prisma.userFollow.findMany({
    where: { followerId: userId, followingId: { in: followerIds } },
    select: { followingId: true },
  });
  const followedSet = new Set(followedBack.map((row) => row.followingId));
  return NextResponse.json({
    ok: true,
    data: rows.map((row) => ({
      ...row.follower,
      followedByMe: followedSet.has(row.followerId),
      followedAt: row.createdAt.toISOString(),
    })),
  });
}

/**
 * 提交或创建社区／关注关系数据，处理对应 POST 请求。
 * 数据库操作：prisma.user.findUnique、prisma.$transaction、tx.userFollow.findUnique、tx.userFollow.delete、tx.userFollow.create、tx.userFollow.count；注意相应的归属过滤与事务边界。
 * 访问前执行游客角色检查，失败直接返回拒绝响应。
 */
export async function POST(request: NextRequest) {
  const guard = await guardVisitor();
  if (!guard.ok) return guard.response;
  const followerId = guard.userId;
  const body = await request.json().catch(() => null);
  const followingId = String(body?.followingId ?? "");
  if (!followingId || followingId === followerId) {
    return NextResponse.json({ ok: false, error: "不能关注自己" }, { status: 400 });
  }
  const target = await prisma.user.findUnique({ where: { id: followingId }, select: { id: true } });
  if (!target) {
    return NextResponse.json({ ok: false, error: "用户不存在" }, { status: 404 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.userFollow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
      select: { id: true },
    });
    if (existing) {
      await tx.userFollow.delete({ where: { id: existing.id } });
    } else {
      await tx.userFollow.create({ data: { followerId, followingId } });
    }
    const count = await tx.userFollow.count({ where: { followingId } });
    return { active: !existing, count };
  });

  revalidatePath("/profile/following");
  revalidatePath("/profile/followers");
  return NextResponse.json({ ok: true, ...result });
}
