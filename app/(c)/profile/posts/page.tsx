import Link from "next/link";
import { redirect } from "next/navigation";
import { MapPin, PenLine } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CommunityPostCard } from "@/features/community/components/CommunityPostCard";
import { communityPostInclude, toCommunityPostDto } from "@/features/community/data";

export default async function ProfilePostsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=%2Fprofile%2Fposts");
  const posts = await prisma.communityPost.findMany({
    where: { userId: user.id, status: "PUBLISHED" },
    include: communityPostInclude,
    orderBy: { createdAt: "desc" },
  });
  const checkins = posts.filter((post) => post.type === "CHECKIN").length;
  const reviews = posts.length - checkins;

  return (
    <>
      <div className="profile-page-head profile-posts-heading">
        <div>
          <h1>我的发布</h1>
          <p>集中管理你在文旅社区分享的打卡与评价。</p>
        </div>
        <div>
          <Link href="/community/new?type=checkin"><MapPin size={15} />我要打卡</Link>
          <Link href="/community/new?type=review"><PenLine size={15} />写评价</Link>
        </div>
      </div>
      <section className="profile-page-body">
        <div className="profile-post-summary">
          <span><b>{posts.length}</b>全部发布</span>
          <span><b>{checkins}</b>打卡</span>
          <span><b>{reviews}</b>评价</span>
        </div>
        {posts.length ? (
          <div className="profile-community-posts">
            {posts.map((post) => <CommunityPostCard key={post.id} post={toCommunityPostDto(post)} />)}
          </div>
        ) : (
          <div className="profile-empty">还没有发布内容，去记录一次真实的福州旅行吧。</div>
        )}
      </section>
    </>
  );
}
