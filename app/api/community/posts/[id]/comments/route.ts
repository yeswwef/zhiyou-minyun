/**
 * @module-note app/api/community/posts/[id]/comments/route.ts
 * 社区／帖子／指定id／评论接口。HTTP请求进入具名方法后执行校验与业务处理，再以响应返回；权限、错误码和数据范围以各分支为准。
 */
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { guardVisitor } from "@/lib/roles";
import { prisma } from "@/lib/db";

const commentInclude = {
  user: { select: { id: true, username: true, nickname: true } },
} as const;

/**
 * 将评论数据库记录转换为页面需要的可序列化字段。
 * 输入：comment；类型与可选项见函数签名。
 */
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

/**
 * 读取社区／帖子／指定id／评论数据，处理对应 GET 请求。
 * 数据库操作：prisma.communityComment.findMany；注意相应的归属过滤与事务边界。
 */
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

/**
 * 提交或创建社区／帖子／指定id／评论数据，处理对应 POST 请求。
 * 数据库操作：prisma.communityPost.findFirst、prisma.communityComment.create、prisma.communityComment.count；注意相应的归属过滤与事务边界。
 * 访问前执行游客角色检查，失败直接返回拒绝响应。
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardVisitor();
  if (!guard.ok) return guard.response;
  const userId = guard.userId;
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
