/**
 * @module-note app/(c)/resources/page.tsx
 * 游客端／文旅资源页面。客户端组件负责筛选与展示，数据经接口获取；不要在此放服务端密钥。
 */
"use client";

import {
  ArrowRight,
  ArrowUpRight,
  MapPin,
  Palette,
  Search,
  SlidersHorizontal,
  Sparkles,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import type {
  DestinationResource,
  ResourceCategory,
} from "@/features/destination-resources/types";
import styles from "./resources.module.css";

const filters: Array<"全部" | ResourceCategory> = ["全部", "景点", "非遗", "美食"];

const sections = [
  {
    type: "景点" as const,
    index: "01",
    kicker: "SCENERY & STREETS",
    title: "山水与街巷",
    description: "从坊巷古厝到江心古寺，把福州的日常走成一条线。",
    icon: MapPin,
  },
  {
    type: "非遗" as const,
    index: "02",
    kicker: "LIVING HERITAGE",
    title: "手上的福州",
    description: "石雕、漆器、软木画与闽剧，看见手艺背后的时间。",
    icon: Palette,
  },
  {
    type: "美食" as const,
    kicker: "LOCAL FLAVOUR",
    index: "03",
    title: "一桌闽味",
    description: "从清晨的锅边糊，到宴席上的佛跳墙。",
    icon: UtensilsCrossed,
  },
];

const featuredSlugs = ["sanfangqixiang", "gushan", "moli", "fotiaoqiang"];

function matches(resource: DestinationResource, keyword: string, tag: string) {
  const needle = keyword.trim().toLowerCase();
  if (tag !== "全部标签" && !resource.tags.includes(tag)) return false;
  if (!needle) return true;
  return [
    resource.name,
    resource.district,
    resource.summary,
    resource.description,
    resource.tags.join(" "),
  ]
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

export default function ResourcesPage() {
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState<(typeof filters)[number]>("全部");
  const [tag, setTag] = useState("全部标签");
  const [resources, setResources] = useState<DestinationResource[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/resources?recommended=true&pageSize=100")
      .then(async (response) => {
        if (!response.ok) throw new Error("资源加载失败");
        return response.json() as Promise<{
          data: DestinationResource[];
          availableTags: string[];
        }>;
      })
      .then((payload) => {
        if (!active) return;
        setResources(payload.data);
        setAvailableTags(payload.availableTags);
        setError("");
      })
      .catch(() => {
        if (active) setError("暂时无法连接资源中心，请稍后重试。");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(
    () =>
      resources.filter(
        (resource) =>
          (category === "全部" || resource.category === category) &&
          matches(resource, keyword, tag),
      ),
    [resources, category, keyword, tag],
  );

  const grouped = category === "全部" && !keyword.trim() && tag === "全部标签";
  const mosaic = featuredSlugs
    .map((slug) => resources.find((resource) => resource.id === slug))
    .filter((resource): resource is DestinationResource => Boolean(resource));
  const hasFilter = Boolean(keyword.trim()) || category !== "全部" || tag !== "全部标签";
  const countOf = (type: ResourceCategory) =>
    resources.filter((resource) => resource.category === type).length;

  const resetFilters = () => {
    setKeyword("");
    setCategory("全部");
    setTag("全部标签");
  };

  return (
    <main className={`resource-page ${styles.page}`}>
      <header className="resource-site-nav">
        <a href="/home" className="resource-brand">
          <span><BrandMark size={19} /></span>
          <strong>智游闽韵</strong>
          <small>FUZHOU TRAVEL</small>
        </a>

        <nav>
          <Link className="active" href="/resources">发现</Link>
          <a href="/plan">行程</a>
          <a href="/home#stories">游记</a>
          <a href="/profile/favorites">我的收藏</a>
        </nav>

        <a href="/home" className="resource-user">返回首页</a>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className="section-kicker">FUZHOU · CULTURAL ATLAS</p>
          <h1>
            把福州，
            <span>走得深一点。</span>
          </h1>
          <p className={styles.lead}>
            从三坊七巷的青石板，到鼓岭的云海；从寿山石的刀锋，到一坛佛跳墙的火候。
            24 个坐标，组成一张可以慢慢读的福州地图。
          </p>

          <div className={styles.stats}>
            <div><strong>12</strong><span>处山水街巷</span></div>
            <div><strong>6</strong><span>项非遗技艺</span></div>
            <div><strong>6</strong><span>道地方风味</span></div>
          </div>

          <div className={styles.heroActions}>
            <a className={styles.primaryAction} href="#all-resources">
              开始探索 <ArrowRight size={16} />
            </a>
            <button
              className={styles.ghostAction}
              type="button"
              onClick={() => setCategory("非遗")}
            >
              看非遗 <Palette size={16} />
            </button>
          </div>
          <p className={styles.heroNote}>
            点击任意卡片，查看开放时间、交通方式与参观建议。
          </p>
        </div>

        <div className={styles.mosaic} aria-label="本周精选">
          {loading && !mosaic.length
            ? [1, 2, 3, 4].map((item) => (
                <div className={`${styles.tile} ${styles.tileSkeleton}`} key={item} />
              ))
            : mosaic.map((resource, index) => (
                <Link
                  className={`${styles.tile} ${index === 0 ? styles.tileMain : ""}`}
                  href={`/resources/${resource.id}`}
                  key={resource.id}
                  style={{
                    backgroundImage: `linear-gradient(0deg, rgba(17,28,22,.78), rgba(17,28,22,.02) 70%), url('${resource.image}')`,
                  }}
                >
                  <span className={styles.tileTag}>{resource.category}</span>
                  <strong>{resource.name}</strong>
                  <small>{resource.district}</small>
                </Link>
              ))}
        </div>
      </section>

      <section className={styles.rail} aria-label="按主题浏览">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <button
              className={styles.railCard}
              key={section.type}
              type="button"
              onClick={() => setCategory(section.type)}
            >
              <span className={styles.railIcon}><Icon size={20} /></span>
              <span className={styles.railText}>
                <b>{section.title}</b>
                <small>{section.description}</small>
              </span>
              <em>{String(countOf(section.type)).padStart(2, "0")}</em>
            </button>
          );
        })}
      </section>

      <section className={styles.toolbar} id="all-resources">
        <div className={styles.searchBox}>
          <Search size={18} />
          <input
            aria-label="搜索文旅资源"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索景点、非遗、美食或区域，例如：鼓山、茉莉、台江"
          />
          {keyword && (
            <button type="button" onClick={() => setKeyword("")} aria-label="清空关键词">
              <X size={15} />
            </button>
          )}
        </div>

        <div className={styles.filterRow}>
          <div className={styles.tabs}>
            {filters.map((item) => (
              <button
                className={category === item ? styles.tabActive : ""}
                key={item}
                type="button"
                onClick={() => setCategory(item)}
              >
                {item}
                {item !== "全部" && <span>{countOf(item)}</span>}
              </button>
            ))}
          </div>

          <div className={styles.filterTools}>
            <label className={styles.select}>
              <SlidersHorizontal size={15} />
              <select value={tag} onChange={(event) => setTag(event.target.value)}>
                <option>全部标签</option>
                {availableTags.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            {hasFilter && (
              <button className={styles.clear} type="button" onClick={resetFilters}>
                <X size={14} /> 清除
              </button>
            )}
          </div>
        </div>
      </section>

      <section className={styles.content}>
        <div className={styles.resultHead}>
          <div>
            <p className="section-kicker">{grouped ? "CURATED ROUTE" : "FILTERED RESULT"}</p>
            <h2>{grouped ? "从山水，到餐桌" : `${category === "全部" ? "搜索结果" : category} · 精选`}</h2>
          </div>
          <p className={styles.resultMeta}>
            <Sparkles size={14} />
            {loading ? "正在整理…" : `共 ${filtered.length} 项 · 按推荐排序`}
          </p>
        </div>

        {loading ? (
          <div className={styles.skeletonGrid}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
              <div className={styles.skeletonCard} key={item}>
                <span />
                <b />
                <i />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className={styles.empty}>{error}</div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
            <strong>没有找到匹配的资源</strong>
            <p>试试更短的关键词，或清除分类与标签筛选。</p>
            <button type="button" onClick={resetFilters}>查看全部 24 项</button>
          </div>
        ) : grouped ? (
          sections.map((section) => {
            const items = filtered.filter((resource) => resource.category === section.type);
            if (!items.length) return null;
            return (
              <section className={styles.section} key={section.type}>
                <div className={styles.sectionHead}>
                  <div className={styles.sectionTitle}>
                    <span>{section.index}</span>
                    <div>
                      <p className="section-kicker">{section.kicker}</p>
                      <h3>{section.title}<em>{items.length} 项</em></h3>
                      <p>{section.description}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setCategory(section.type)}>
                    查看全部 <ArrowRight size={15} />
                  </button>
                </div>

                <div
                  className={
                    section.type === "景点"
                      ? styles.scenicGrid
                      : section.type === "非遗"
                        ? styles.ichGrid
                        : styles.foodGrid
                  }
                >
                  {items.map((resource) => (
                    <ResourceTile
                      key={resource.id}
                      resource={resource}
                      variant={
                        section.type === "景点"
                          ? "scenic"
                          : section.type === "非遗"
                            ? "ich"
                            : "food"
                      }
                    />
                  ))}
                </div>
              </section>
            );
          })
        ) : (
          <div className={styles.flatGrid}>
            {filtered.map((resource) => (
              <ResourceTile
                key={resource.id}
                resource={resource}
                variant={
                  resource.category === "景点"
                    ? "scenic"
                    : resource.category === "非遗"
                      ? "ich"
                      : "food"
                }
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function ResourceTile({
  resource,
  variant,
}: {
  resource: DestinationResource;
  variant: "scenic" | "ich" | "food";
}) {
  const tags = resource.tags.slice(0, 3);

  if (variant === "ich") {
    return (
      <Link className={`${styles.card} ${styles.ichCard}`} href={`/resources/${resource.id}`}>
        <div
          className={styles.ichImage}
          style={{ backgroundImage: `url('${resource.image}')` }}
        >
          <span className={styles.badge}>{resource.category}</span>
        </div>
        <div className={styles.ichBody}>
          <span className={styles.eyebrow}>非遗 · {resource.district}</span>
          <h4>{resource.name}</h4>
          <p>{resource.summary}</p>
          <div className={styles.tags}>
            {tags.map((item) => <span key={item}>{item}</span>)}
          </div>
          <span className={styles.cardLink}>看技艺 <ArrowUpRight size={14} /></span>
        </div>
      </Link>
    );
  }

  if (variant === "food") {
    return (
      <Link className={`${styles.card} ${styles.foodCard}`} href={`/resources/${resource.id}`}>
        <div
          className={styles.foodImage}
          style={{ backgroundImage: `url('${resource.image}')` }}
        >
          <span className={styles.badge}>{resource.category}</span>
        </div>
        <div className={styles.foodBody}>
          <span className={styles.eyebrow}>风味 · {resource.district}</span>
          <h4>{resource.name}</h4>
          <p>{resource.summary}</p>
          <div className={styles.tags}>
            {tags.map((item) => <span key={item}>{item}</span>)}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link className={`${styles.card} ${styles.scenicCard}`} href={`/resources/${resource.id}`}>
      <div
        className={styles.scenicImage}
        style={{ backgroundImage: `url('${resource.image}')` }}
      >
        <span className={styles.badge}>{resource.category}</span>
        <span className={styles.district}><MapPin size={12} /> {resource.district}</span>
      </div>
      <div className={styles.scenicBody}>
        <h4>{resource.name}</h4>
        <p>{resource.summary}</p>
        <div className={styles.tags}>
          {tags.map((item) => <span key={item}>{item}</span>)}
        </div>
        <span className={styles.cardLink}>查看详情 <ArrowUpRight size={14} /></span>
      </div>
    </Link>
  );
}
