/**
 * @module-note app/api/community/comments/[id]/route.ts
 * 社区／评论／指定id接口。HTTP请求进入具名方法后执行校验与业务处理，再以响应返回；权限、错误码和数据范围以各分支为准。
 */
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { guardVisitor } from "@/lib/roles";
import { prisma } from "@/lib/db";

/**
 * 删除或取消社区／评论／指定id数据，处理对应 DELETE 请求。
 * 数据库操作：prisma.communityComment.findUnique、prisma.communityComment.delete、prisma.communityComment.count；注意相应的归属过滤与事务边界。
 * 访问前执行游客角色检查，失败直接返回拒绝响应。
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardVisitor();
  if (!guard.ok) return guard.response;
  const userId = guard.userId;
  const { id } = await params;
  const comment = await prisma.communityComment.findUnique({
    where: { id },
    select: { userId: true, postId: true },
  });
  if (!comment) {
    return NextResponse.json({ ok: false, error: "评论不存在" }, { status: 404 });
  }
  if (comment.userId !== userId) {
    return NextResponse.json({ ok: false, error: "只能删除自己的评论" }, { status: 403 });
  }
  await prisma.communityComment.delete({ where: { id } });
  const count = await prisma.communityComment.count({ where: { postId: comment.postId } });
  revalidatePath("/community");
  revalidatePath(`/community/${comment.postId}`);
  return NextResponse.json({ ok: true, count });
}
