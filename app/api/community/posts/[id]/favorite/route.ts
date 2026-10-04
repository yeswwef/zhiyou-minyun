import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "请先登录" }, { status: 401 });
  }
  const { id: postId } = await params;
  const post = await prisma.communityPost.findFirst({
    where: { id: postId, status: "PUBLISHED" },
    select: { id: true },
  });
  if (!post) {
    return NextResponse.json({ ok: false, error: "内容不存在" }, { status: 404 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.communityPostFavorite.findUnique({
      where: { userId_postId: { userId, postId } },
      select: { id: true },
    });
    if (existing) {
      await tx.communityPostFavorite.delete({ where: { id: existing.id } });
    } else {
      await tx.communityPostFavorite.create({ data: { userId, postId } });
    }
    const count = await tx.communityPostFavorite.count({ where: { postId } });
    return { active: !existing, count };
  });

  revalidatePath("/profile/favorites");
  revalidatePath("/community");
  revalidatePath(`/community/${postId}`);
  return NextResponse.json({ ok: true, ...result });
}
