import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, MapPin, Star } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { communityPostInclude, toCommunityPostDto } from "@/features/community/data";
import { CommunityPostActions } from "@/features/community/components/CommunityPostActions";
import { CommunityPostCard } from "@/features/community/components/CommunityPostCard";
import { CommunityDetailEngagement } from "@/features/community/components/CommunityDetailEngagement";
import { formatCommunityDate, postTypeLabel, resourceTypeLabel } from "@/features/community/types";

export default async function CommunityPostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [record, user] = await Promise.all([
    prisma.communityPost.findFirst({ where: { id, status: "PUBLISHED" }, include: communityPostInclude }),
    getSessionUser(),
  ]);
  if (!record) notFound();

  const [comments, related, liked, saved, followed, followerCount] = await Promise.all([
    prisma.communityComment.findMany({
      where: { postId: id },
      include: { user: { select: { id: true, username: true, nickname: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.communityPost.findMany({
      where: { resourceId: record.resourceId, id: { not: id }, status: "PUBLISHED" },
      include: communityPostInclude,
      orderBy: [{ recommendationWeight: "desc" }, { createdAt: "desc" }],
      take: 12,
    }),
    user
      ? prisma.communityPostLike.findUnique({ where: { userId_postId: { userId: user.id, postId: id } } })
      : Promise.resolve(null),
    user
      ? prisma.communityPostFavorite.findUnique({ where: { userId_postId: { userId: user.id, postId: id } } })
      : Promise.resolve(null),
    user && user.id !== record.userId
      ? prisma.userFollow.findUnique({
          where: { followerId_followingId: { followerId: user.id, followingId: record.userId } },
        })
      : Promise.resolve(null),
    prisma.userFollow.count({ where: { followingId: record.userId } }),
  ]);

  const post = toCommunityPostDto(record);
  const cover = post.images[0]?.imageUrl || post.resource.image || "/images/sanfangqixiang.jpg";
  const commentDtos = comments.map((comment) => ({
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
    author: comment.user,
  }));

  return (
    <article className="community-detail-page community-story-page">
      <Link href="/community" className="community-back"><ArrowLeft size={16} />返回社区</Link>

      <div className="community-story-shell">
        <section className="community-story-media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="community-story-main-image" src={cover} alt={post.title} />
          {post.images.length > 1 && (
            <div className="community-story-thumbnails">
              {post.images.map((image, index) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={image.id} src={image.imageUrl} alt={`${post.title}图片 ${index + 1}`} />
              ))}
            </div>
          )}
        </section>

        <section className="community-story-panel">
          <CommunityDetailEngagement
            postId={post.id}
            author={post.author}
            viewerId={user?.id ?? null}
            initialLiked={Boolean(liked)}
            initialSaved={Boolean(saved)}
            initialFollowing={Boolean(followed)}
            initialFollowerCount={followerCount}
            initialCounts={post.counts}
            initialComments={commentDtos}
          >
            <div className="community-story-copy">
              <div className="community-detail-labels">
                <span className={post.type.toLowerCase()}>
                  {post.type === "CHECKIN" ? <MapPin size={15} /> : <Star size={15} fill="currentColor" />}
                  {postTypeLabel(post.type)}
                </span>
                <Link href={`/community?resourceId=${post.resource.slug}`}>{resourceTypeLabel(post.resource.type)} · {post.resource.title}</Link>
              </div>
              <h1>{post.title}</h1>
              {post.rating && (
                <div className="community-rating detail">
                  {Array.from({ length: 5 }, (_, index) => <Star key={index} size={19} fill={index < post.rating! ? "currentColor" : "none"} />)}
                  <b>{post.rating}.0</b>
                </div>
              )}
              <p>{post.content}</p>

              <Link className="community-story-resource" href={`/resources/${post.resource.slug}`}>
                <span style={{ backgroundImage: `url('${post.resource.image || cover}')` }} />
                <div>
                  <small>{resourceTypeLabel(post.resource.type)} · {post.resource.district || "福州"}</small>
                  <strong>{post.resource.title}</strong>
                  <em>查看资源详情</em>
                </div>
              </Link>

              <div className="community-story-meta">
                <span>发布于 {formatCommunityDate(post.createdAt)}</span>
                {post.visitedAt && <span><CalendarDays size={13} />游览于 {new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric" }).format(new Date(post.visitedAt))}</span>}
              </div>
              {user?.id === post.author.id && <CommunityPostActions postId={post.id} />}
            </div>
          </CommunityDetailEngagement>
        </section>
      </div>

      <section className="community-related" id="related">
        <header><h2>相关推荐</h2><p>更多关于“{post.resource.title}”的打卡与评价</p></header>
        {related.length ? (
          <div className="community-related-grid">
            {related.map((item) => <CommunityPostCard key={item.id} post={toCommunityPostDto(item)} />)}
          </div>
        ) : (
          <div className="community-related-empty">这个资源暂时没有其他内容，欢迎发布新的打卡。</div>
        )}
      </section>
    </article>
  );
}
