"use client";

import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { ResourceCard } from "@/features/destination-resources/components/ResourceCard";
import type { DestinationResource, ResourceCategory } from "@/features/destination-resources/types";

const categories: Array<"全部" | ResourceCategory> = [
  "全部",
  "景点",
  "非遗",
  "美食",
];

export default function ResourcesPage() {
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>(
    "全部",
  );
  const [tag, setTag] = useState("全部标签");
  const [resources, setResources] = useState<DestinationResource[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 6;
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const query = new URLSearchParams();
    if (keyword.trim()) query.set("q", keyword.trim());
    if (category !== "全部") query.set("category", category);
    if (tag !== "全部标签") query.set("tag", tag);
    query.set("page", String(page));
    query.set("pageSize", String(pageSize));

    fetch(`/api/resources?${query.toString()}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("资源加载失败");
        return response.json() as Promise<{
          data: DestinationResource[];
          availableTags: string[];
          pagination: { total: number; totalPages: number };
        }>;
      })
      .then((payload) => {
        setResources(payload.data);
        setAvailableTags(payload.availableTags);
        setTotal(payload.pagination.total);
        setTotalPages(payload.pagination.totalPages);
        setError("");
      })
      .catch(() => setError("暂时无法连接资源中心，请稍后重试。"))
      .finally(() => setLoading(false));
  }, [keyword, category, tag, page]);
  return (
    <main className="resource-page">
      <header className="resource-site-nav">
        <a href="/home" className="resource-brand">
          <span><BrandMark size={19} /></span>
          <strong>智游闽韵</strong>
          <small>FUZHOU TRAVEL</small>
        </a>

        <nav>
          <Link className="active" href="/resources">
            发现
          </Link>
          <a href="/home#plan">行程</a>
          <a href="/home#stories">游记</a>
          <a href="/profile/favorites">我的收藏</a>
        </nav>

        <a href="/home" className="resource-user">
          返回首页
        </a>
      </header>

      <header className="resource-header">
        <div>
          <p className="section-kicker">DESTINATION RESOURCE</p>
          <h1>探索福州</h1>
          <p>景点、非遗与美食，找到你想去的地方。</p>
        </div>
        <a href="/home" className="resource-back">
          返回首页
        </a>
      </header>

      <section className="resource-toolbar">
        <div className="resource-search">
          <Search size={18} />
          <input
            value={keyword}
              onChange={(event) => {
                setKeyword(event.target.value);
                setPage(1);
              }}
            placeholder="搜索景点、美食、非遗或区域"
          />
        </div>

        <div className="resource-filter-row">
          <div className="category-tabs">
            {categories.map((item) => (
              <button
                className={category === item ? "selected" : ""}
                key={item}
                onClick={() => {
                  setCategory(item);
                  setPage(1);
                }}
              >
                {item}
              </button>
            ))}
          </div>

          <label className="tag-select">
            <SlidersHorizontal size={15} />
            <select
              value={tag}
              onChange={(event) => {
                setTag(event.target.value);
                setPage(1);
              }}
            >
              <option>全部标签</option>
              {availableTags.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>

        {(keyword || tag !== "全部标签" || category !== "全部") && (
          <button
            className="clear-filter"
            onClick={() => {
              setKeyword("");
              setTag("全部标签");
              setCategory("全部");
              setPage(1);
            }}
          >
            <X size={14} />
            清除筛选
          </button>
        )}
      </section>

      <section className="resource-results">
        <div className="resource-result-heading">
          <h2>福州文旅资源</h2>
          <span>共 {total} 项</span>
        </div>

        {loading ? (
          <div className="resource-empty">正在加载文旅资源……</div>
        ) : error ? (
          <div className="resource-empty">{error}</div>
        ) : resources.length ? (
          <div className="resource-grid">
            {resources.map((resource) => (
              <ResourceCard resource={resource} key={resource.id} />
            ))}
          </div>
        ) : (
          <div className="resource-empty">
            没有找到匹配的资源，试试其他关键词或标签。
          </div>
        )}

        {!loading && !error && totalPages > 1 && (
          <nav className="resource-pagination" aria-label="资源分页">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
            >
              <ChevronLeft size={16} /> 上一页
            </button>
            <span>第 {page} / {totalPages} 页</span>
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage((current) => Math.min(current + 1, totalPages))}
            >
              下一页 <ChevronRight size={16} />
            </button>
          </nav>
        )}
      </section>
    </main>
  );
}
