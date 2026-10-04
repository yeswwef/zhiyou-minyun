import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Heart, MapPin, PenLine, UserCheck, UsersRound } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { communityPostInclude, toCommunityPostDto } from "@/features/community/data";
import { CommunityPostCard } from "@/features/community/components/CommunityPostCard";
import { FollowButton } from "@/features/community/components/FollowButton";

const TABS = [
  { key: "ALL", label: "全部作品" },
  { key: "CHECKIN", label: "打卡" },
  { key: "REVIEW", label: "评价" },
] as const;

export default async function CommunityUserPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const requestedType = typeof query.type === "string" ? query.type : "ALL";
  const activeType = TABS.some((tab) => tab.key === requestedType) ? requestedType : "ALL";
  const [creator, viewer] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, nickname: true, role: true, createdAt: true },
    }),
    getSessionUser(),
  ]);
  if (!creator) notFound();

  const [posts, followerCount, followingCount, receivedLikes, isFollowing, checkinCount, reviewCount] = await Promise.all([
    prisma.communityPost.findMany({
      where: {
        userId: id,
        status: "PUBLISHED",
        ...(activeType === "CHECKIN" || activeType === "REVIEW" ? { type: activeType } : {}),
      },
      include: communityPostInclude,
      orderBy: { createdAt: "desc" },
    }),
    prisma.userFollow.count({ where: { followingId: id } }),
    prisma.userFollow.count({ where: { followerId: id } }),
    prisma.communityPostLike.count({ where: { post: { userId: id, status: "PUBLISHED" } } }),
    viewer && viewer.id !== id
      ? prisma.userFollow.findUnique({
          where: { followerId_followingId: { followerId: viewer.id, followingId: id } },
          select: { id: true },
        })
      : Promise.resolve(null),
    prisma.communityPost.count({ where: { userId: id, status: "PUBLISHED", type: "CHECKIN" } }),
    prisma.communityPost.count({ where: { userId: id, status: "PUBLISHED", type: "REVIEW" } }),
  ]);
  const name = creator.nickname || creator.username;

  return (
    <section className="community-creator-page">
      <Link href="/community" className="community-back"><ArrowLeft size={16} />返回社区</Link>
      <header className="community-creator-hero">
        <div className="community-creator-cover" />
        <div className="community-creator-main">
          <span className="community-creator-avatar">{name.slice(0, 1)}</span>
          <div className="community-creator-identity">
            <div><h1>{name}</h1><em>{creator.role === "B" ? "商户 / 传承人" : "文旅体验官"}</em></div>
            <p>@{creator.username} · 加入于 {new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long" }).format(creator.createdAt)}</p>
          </div>
          {viewer?.id === creator.id ? (
            <Link className="community-creator-own" href="/profile/posts">管理我的发布</Link>
          ) : (
            <FollowButton userId={creator.id} viewerId={viewer?.id ?? null} initialFollowing={Boolean(isFollowing)} />
          )}
        </div>

        <div className="community-creator-stats">
          <div><UsersRound size={19} /><b>{followerCount}</b><span>粉丝</span></div>
          <div><UserCheck size={19} /><b>{followingCount}</b><span>关注</span></div>
          <div><Heart size={19} /><b>{receivedLikes}</b><span>获赞总数</span></div>
          <div><MapPin size={19} /><b>{checkinCount}</b><span>打卡</span></div>
          <div><PenLine size={19} /><b>{reviewCount}</b><span>评价</span></div>
        </div>
      </header>

      <nav className="community-creator-tabs" aria-label="作品分类">
        {TABS.map((tab) => (
          <Link key={tab.key} className={activeType === tab.key ? "active" : ""} href={`/community/users/${creator.id}?type=${tab.key}`}>
            {tab.label}
            <span>{tab.key === "ALL" ? checkinCount + reviewCount : tab.key === "CHECKIN" ? checkinCount : reviewCount}</span>
          </Link>
        ))}
      </nav>

      {posts.length ? (
        <div className="community-card-grid community-creator-grid">
          {posts.map((post) => <CommunityPostCard key={post.id} post={toCommunityPostDto(post)} />)}
        </div>
      ) : (
        <div className="community-empty"><Heart size={34} /><h2>这里还没有作品</h2><p>该用户暂未发布这一类型的社区内容。</p></div>
      )}
    </section>
  );
}
