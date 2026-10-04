import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { communityPostInclude, toCommunityPostDto } from "@/features/community/data";
import { CommunityPostForm } from "@/features/community/components/CommunityPostForm";

export default async function EditCommunityPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/community/${id}/edit`)}`);
  const post = await prisma.communityPost.findUnique({ where: { id }, include: communityPostInclude });
  if (!post || post.status !== "PUBLISHED") notFound();
  if (post.userId !== user.id) redirect(`/community/${id}`);
  const resources = await prisma.resource.findMany({
    orderBy: [{ type: "asc" }, { recommendationWeight: "desc" }],
    select: { slug: true, title: true, type: true, image: true },
  });

  return (
    <section className="community-editor-page">
      <Link href={`/community/${id}`} className="community-back"><ArrowLeft size={16} />返回内容详情</Link>
      <header><p className="section-kicker">EDIT STORY</p><h1>修改我的发布</h1><p>完善内容后保存，社区中会立即更新。</p></header>
      <CommunityPostForm resources={resources} initialType={post.type} initialPost={toCommunityPostDto(post)} />
    </section>
  );
}
