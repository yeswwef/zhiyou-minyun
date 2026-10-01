import { ArrowLeft, Clock3, Heart, MapPin } from "lucide-react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { FavoriteButton } from "@/features/destination-resources/components/FavoriteButton";

export default async function ResourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const resource = await prisma.resource.findUnique({
    where: { slug: id },
    include: { tags: { include: { tag: true } } },
  });

  if (!resource) {
    notFound();
  }

  const relatedResources = await prisma.resource.findMany({
    where: {
      type: resource.type,
      id: { not: resource.id },
    },
    orderBy: [
      { recommendationWeight: "desc" },
      { updatedAt: "desc" },
    ],
    take: 3,
    select: {
      slug: true,
      title: true,
      summary: true,
      image: true,
    },
  });

  return (
    <main className="resource-detail-page">
      <header className="resource-site-nav">
        <a href="/home" className="resource-brand">
          <span>闽</span>
          <strong>智游闽韵</strong>
          <small>FUZHOU TRAVEL</small>
        </a>

        <nav>
          <Link className="active" href="/resources">发现</Link>
          <a href="/home#plan">行程</a>
          <a href="/home#stories">游记</a>
          <a href="/profile/favorites">我的收藏</a>
        </nav>

        <a href="/home" className="resource-user">返回首页</a>
      </header>

      <Link className="detail-back" href="/resources">
        <ArrowLeft size={16} />
        返回资源中心
      </Link>

      <div
        className="detail-hero"
        style={{
          backgroundImage: `url('${resource.image ?? "/images/sanfangqixiang.jpg"}')`,
        }}
      >
        <div className="detail-hero-shade" />
        <div className="detail-hero-copy">
          <span>{resource.type === "SCENIC" ? "景点" : resource.type === "ICH" ? "非遗" : "美食"} · {resource.district}</span>
          <h1>{resource.title}</h1>
          <p>{resource.summary}</p>
        </div>
      </div>

      <div className="detail-layout">
        <article className="detail-content">
          <div className="detail-actions">
            <FavoriteButton resourceId={resource.slug} />
            <button className="detail-action">
              <Heart size={16} />
              加入行程
            </button>
          </div>

          <section>
            <p className="section-kicker">ABOUT</p>
            <h2>关于这里</h2>
            <p>{resource.description}</p>
          </section>

          <section>
            <p className="section-kicker">HISTORY</p>
            <h2>历史背景</h2>
            <p>{resource.history}</p>
          </section>
        </article>

        <aside className="detail-facts">
          <h2>实用信息</h2>

          <div>
            <Clock3 size={18} />
            <span>
              <b>开放时间</b>
              {resource.openTime ?? "以现场公告为准"}
            </span>
          </div>

          <div>
            <MapPin size={18} />
            <span>
              <b>地址</b>
              {resource.address ?? "福州市"}
            </span>
          </div>

          <div>
            <span className="fact-dot" />
            <span>
              <b>相关标签</b>
              <small className="detail-tags">
              {resource.tags.map(({ tag }) => (
                <em key={tag.name}>{tag.name}</em>
                ))}
              </small>
            </span>
          </div>

          <div>
            <span className="fact-dot" />
            <span>
              <b>资料来源</b>
              {resource.source}
            </span>
          </div>
        </aside>
      </div>

      {relatedResources.length > 0 && (
        <section className="related-resources">
          <div className="related-heading">
            <div>
              <p className="section-kicker">YOU MAY ALSO LIKE</p>
              <h2>同类资源</h2>
            </div>
            <Link href="/resources">浏览全部资源 <ArrowLeft size={15} /></Link>
          </div>
          <div className="related-grid">
            {relatedResources.map((item) => (
              <Link className="related-card" href={`/resources/${item.slug}`} key={item.slug}>
                <div
                  className="related-card-image"
                  style={{ backgroundImage: `url('${item.image ?? "/images/sanfangqixiang.jpg"}')` }}
                />
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.summary}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
