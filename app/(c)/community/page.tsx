import Link from "next/link";
import { ChevronRight, MapPin, PenLine, Sparkles } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { CommunityPostCard } from "@/features/community/components/CommunityPostCard";
import { communityPostInclude, toCommunityPostDto } from "@/features/community/data";
import { buildCommunitySearchWhere } from "@/features/community/search";

const FILTERS = [
  { key: "recommended", label: "推荐" },
  { key: "latest", label: "最新" },
  { key: "SCENIC", label: "景点" },
  { key: "ICH", label: "非遗" },
  { key: "FOOD", label: "美食" },
] as const;

const HOT_TOPICS = [
  { label: "三坊七巷慢游攻略", resourceId: "sanfangqixiang", category: "景点" },
  { label: "福州鱼丸寻味记", resourceId: "fuzhou-fishball", category: "美食" },
  { label: "鼓山徒步日记", resourceId: "gushan", category: "景点" },
  { label: "茉莉花茶的故事", resourceId: "moli", category: "非遗" },
  { label: "寿山石雕匠心", resourceId: "moyan", category: "非遗" },
] as const;

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const requestedFilter = typeof params.filter === "string" ? params.filter : "recommended";
  const activeFilter = FILTERS.some((item) => item.key === requestedFilter) ? requestedFilter : "recommended";
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 60) : "";
  const resourceId = typeof params.resourceId === "string" ? params.resourceId.trim().slice(0, 100) : "";
  const authorId = typeof params.authorId === "string" ? params.authorId.trim().slice(0, 100) : "";
  const page = Math.max(Number(typeof params.page === "string" ? params.page : 1) || 1, 1);
  const pageSize = 10;
  const [user, selectedResource, selectedAuthor, searchWhere] = await Promise.all([
    getSessionUser(),
    resourceId
      ? prisma.resource.findFirst({
          where: { OR: [{ slug: resourceId }, { id: resourceId }] },
          select: { id: true, slug: true, title: true, type: true },
        })
      : Promise.resolve(null),
    authorId
      ? prisma.user.findUnique({
          where: { id: authorId },
          select: { id: true, username: true, nickname: true },
        })
      : Promise.resolve(null),
    buildCommunitySearchWhere(query),
  ]);

  const where: Prisma.CommunityPostWhereInput = {
    status: "PUBLISHED",
    AND: [
      ...(["SCENIC", "ICH", "FOOD"].includes(activeFilter)
        ? [{ resource: { is: { type: activeFilter as "SCENIC" | "ICH" | "FOOD" } } }]
        : []),
      ...(resourceId
        ? [{ resource: { is: { OR: [{ slug: resourceId }, { id: resourceId }] } } }]
        : []),
      ...(authorId ? [{ userId: authorId }] : []),
      ...(searchWhere ? [searchWhere] : []),
    ],
  };
  const orderBy: Prisma.CommunityPostOrderByWithRelationInput[] =
    activeFilter === "latest"
      ? [{ createdAt: "desc" }]
      : [{ recommendationWeight: "desc" }, { createdAt: "desc" }];

  const [posts, total] = await Promise.all([
    prisma.communityPost.findMany({
      where,
      include: communityPostInclude,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.communityPost.count({ where }),
  ]);
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const actionHref = (type: "checkin" | "review") =>
    user ? `/community/new?type=${type}` : `/login?next=${encodeURIComponent(`/community/new?type=${type}`)}`;

  return (
    <>
      <section className="community-hero-panel">
        <div>
          <p>有福之州 · 山海相拥 · 处处皆故事</p>
          <h1>文旅社区</h1>
          <h2>榕城生活　本地人都在看</h2>
        </div>
        <span className="community-hero-seal">福</span>
      </section>

      <div className="community-home-layout">
        <section className="community-feed">
          <nav className="community-filter-tabs" aria-label="社区分类">
            {FILTERS.map((filter) => (
              <Link
                key={filter.key}
                className={activeFilter === filter.key ? "active" : ""}
                href={`/community?filter=${filter.key}${query ? `&q=${encodeURIComponent(query)}` : ""}${resourceId ? `&resourceId=${encodeURIComponent(resourceId)}` : ""}${authorId ? `&authorId=${encodeURIComponent(authorId)}` : ""}`}
              >
                {filter.label}
              </Link>
            ))}
          </nav>

          {query && (
            <div className="community-search-result">
              “{query}”的搜索结果，共 {total} 条
              <Link href="/community">清除搜索</Link>
            </div>
          )}

          {!query && resourceId && (
            <div className="community-search-result">
              {selectedResource
                ? `“${selectedResource.title}”的全部打卡与评价，共 ${total} 条`
                : "未找到对应的文旅资源"}
              <Link href="/community">查看全部社区内容</Link>
            </div>
          )}

          {!query && !resourceId && authorId && (
            <div className="community-search-result">
              {selectedAuthor
                ? `“${selectedAuthor.nickname || selectedAuthor.username}”的全部发布，共 ${total} 条`
                : "未找到对应的社区用户"}
              <Link href="/community">查看全部社区内容</Link>
            </div>
          )}

          {posts.length ? (
            <div className="community-card-grid">
              {posts.map((post) => <CommunityPostCard key={post.id} post={toCommunityPostDto(post)} />)}
            </div>
          ) : (
            <div className="community-empty">
              <Sparkles size={35} />
              <h2>这里还在等待第一段福州故事</h2>
              <p>换个分类看看，或者发布你的打卡与评价。</p>
              <Link href={actionHref("checkin")}>发布第一条打卡</Link>
            </div>
          )}

          {totalPages > 1 && (
            <nav className="community-pagination" aria-label="分页">
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((item) => (
                <Link
                  key={item}
                  className={item === page ? "active" : ""}
                  href={`/community?filter=${activeFilter}&page=${item}${query ? `&q=${encodeURIComponent(query)}` : ""}${resourceId ? `&resourceId=${encodeURIComponent(resourceId)}` : ""}${authorId ? `&authorId=${encodeURIComponent(authorId)}` : ""}`}
                >
                  {item}
                </Link>
              ))}
            </nav>
          )}
        </section>

        <aside className="community-right-rail">
          <div className="community-quick-actions">
            <Link className="checkin" href={actionHref("checkin")}>
              <MapPin size={29} fill="currentColor" />
              <span><strong>我要打卡<ChevronRight size={19} /></strong><small>分享你的福州时刻</small></span>
            </Link>
            <Link className="review" href={actionHref("review")}>
              <PenLine size={29} />
              <span><strong>写评价<ChevronRight size={19} /></strong><small>分享真实体验，帮助他人选店</small></span>
            </Link>
          </div>

          <section className="community-topic-panel">
            <div className="community-side-heading"><h2>榕城热话</h2></div>
            {HOT_TOPICS.map((topic, index) => (
              <Link href={`/community?resourceId=${encodeURIComponent(topic.resourceId)}`} key={topic.label}>
                <b>{index + 1}</b><span>{topic.label}<small>{topic.category}</small></span><ChevronRight size={14} />
              </Link>
            ))}
          </section>
        </aside>
      </div>
    </>
  );
}
