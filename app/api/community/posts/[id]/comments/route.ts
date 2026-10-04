import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";

const commentInclude = {
  user: { select: { id: true, username: true, nickname: true } },
} as const;

function toComment(comment: {
  id: string;
  content: string;
  createdAt: Date;
  user: { id: string; username: string; nickname: string | null };
}) {
  return {
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
    author: comment.user,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: postId } = await params;
  const comments = await prisma.communityComment.findMany({
    where: { postId, post: { status: "PUBLISHED" } },
    include: commentInclude,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ ok: true, data: comments.map(toComment) });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "请先登录" }, { status: 401 });
  }
  const { id: postId } = await params;
  const body = await request.json().catch(() => null);
  const content = String(body?.content ?? "").trim();
  if (!content || content.length > 500) {
    return NextResponse.json({ ok: false, error: "评论不能为空，最多 500 个字" }, { status: 400 });
  }
  const post = await prisma.communityPost.findFirst({
    where: { id: postId, status: "PUBLISHED" },
    select: { id: true },
  });
  if (!post) {
    return NextResponse.json({ ok: false, error: "内容不存在" }, { status: 404 });
  }
  const comment = await prisma.communityComment.create({
    data: { userId, postId, content },
    include: commentInclude,
  });
  const count = await prisma.communityComment.count({ where: { postId } });
  revalidatePath("/community");
  revalidatePath(`/community/${postId}`);
  return NextResponse.json({ ok: true, data: toComment(comment), count }, { status: 201 });
}
