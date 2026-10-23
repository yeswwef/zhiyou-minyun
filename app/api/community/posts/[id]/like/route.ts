/**
 * @module-note app/api/community/posts/[id]/like/route.ts
 * 社区／帖子／指定id／点赞接口。HTTP请求进入具名方法后执行校验与业务处理，再以响应返回；权限、错误码和数据范围以各分支为准。
 */
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { guardVisitor } from "@/lib/roles";
import { prisma } from "@/lib/db";

/**
 * 提交或创建社区／帖子／指定id／点赞数据，处理对应 POST 请求。
 * 数据库操作：prisma.communityPost.findFirst、prisma.$transaction、tx.communityPostLike.findUnique、tx.communityPostLike.delete、tx.communityPostLike.create、tx.communityPostLike.count；注意相应的归属过滤与事务边界。
 * 访问前执行游客角色检查，失败直接返回拒绝响应。
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardVisitor();
  if (!guard.ok) return guard.response;
  const userId = guard.userId;
  const { id: postId } = await params;
  const post = await prisma.communityPost.findFirst({
    where: { id: postId, status: "PUBLISHED" },
    select: { id: true },
  });
  if (!post) {
    return NextResponse.json({ ok: false, error: "内容不存在" }, { status: 404 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.communityPostLike.findUnique({
      where: { userId_postId: { userId, postId } },
      select: { id: true },
    });
    if (existing) {
      await tx.communityPostLike.delete({ where: { id: existing.id } });
    } else {
      await tx.communityPostLike.create({ data: { userId, postId } });
    }
    const count = await tx.communityPostLike.count({ where: { postId } });
    return { active: !existing, count };
  });

  revalidatePath("/community");
  revalidatePath(`/community/${postId}`);
  return NextResponse.json({ ok: true, ...result });
}
