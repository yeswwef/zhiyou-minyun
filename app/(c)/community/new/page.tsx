import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CommunityPostForm } from "@/features/community/components/CommunityPostForm";

export default async function NewCommunityPostPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const type = params.type === "review" ? "REVIEW" : "CHECKIN";
  const resourceId = typeof params.resourceId === "string" ? params.resourceId : undefined;
  const nextPath = `/community/new?type=${type.toLowerCase()}${resourceId ? `&resourceId=${encodeURIComponent(resourceId)}` : ""}`;
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);

  const resources = await prisma.resource.findMany({
    orderBy: [{ type: "asc" }, { recommendationWeight: "desc" }],
    select: { slug: true, title: true, type: true, image: true },
  });

  return (
    <section className="community-editor-page">
      <Link href="/community" className="community-back"><ArrowLeft size={16} />返回社区</Link>
      <header>
        <p className="section-kicker">SHARE YOUR FUZHOU MOMENT</p>
        <h1>{type === "CHECKIN" ? "记录一次榕城打卡" : "写下真实文旅评价"}</h1>
        <p>让每一次到访都成为别人认识福州的一扇窗。</p>
      </header>
      <CommunityPostForm resources={resources} initialType={type} initialResourceId={resourceId} />
    </section>
  );
}
