import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "请先登录" }, { status: 401 });
  }
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
