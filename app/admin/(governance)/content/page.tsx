/**
 * @module-note app/admin/content/page.tsx
 * 平台管理中心：社区内容审核与文旅资源推荐位管理。
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Search, Sparkles, Star } from "lucide-react";

type Post = {
  id: string;
  title: string;
  content: string;
  type: "CHECKIN" | "REVIEW";
  status: "PUBLISHED" | "HIDDEN";
  rating: number | null;
  createdAt: string;
  user: { username: string; nickname: string | null; role: string };
  resource: { title: string; slug: string };
  _count: { likes: number; comments: number; favorites: number };
};
type Resource = {
  id: string;
  slug: string;
  title: string;
  type: "SCENIC" | "FOOD" | "ICH";
  district: string | null;
  summary: string;
  recommendationWeight: number;
  tags: { tag: { name: string } }[];
  _count: { favorites: number; resourceViews: number; communityPosts: number };
};
type Stats = { posts: number; hidden: number; resources: number; featured: number };

const typeLabels = { SCENIC: "景点", ICH: "非遗", FOOD: "美食" } as const;
const filters = [["posts", "社区内容"], ["resources", "文旅资源"]] as const;

export default function AdminContentPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [stats, setStats] = useState<Stats>({ posts: 0, hidden: 0, resources: 0, featured: 0 });
  const [tab, setTab] = useState<"posts" | "resources">("posts");
  const [query, setQuery] = useState("");
  const [version, setVersion] = useState(0);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/content", { signal: controller.signal })
      .then((response) => response.json())
      .then((payload) => {
        setPosts(payload.posts ?? []);
        setResources(payload.resources ?? []);
        setStats(payload.stats ?? { posts: 0, hidden: 0, resources: 0, featured: 0 });
      })
      .catch(() => {});
    return () => controller.abort();
  }, [version]);

  const visiblePosts = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return posts;
    return posts.filter((post) => `${post.title}${post.content}${post.user.nickname ?? ""}${post.user.username}${post.resource.title}`.toLowerCase().includes(keyword));
  }, [posts, query]);

  const visibleResources = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return resources;
    return resources.filter((resource) => `${resource.title}${resource.summary}${resource.district ?? ""}`.toLowerCase().includes(keyword));
  }, [resources, query]);

  async function act(kind: "post" | "resource", id: string, action: string, success: string) {
    const response = await fetch("/api/admin/content", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, id, action }),
    });
    const payload = await response.json();
    setMessage(payload.error ?? success);
    if (response.ok) setVersion((value) => value + 1);
  }

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div><p>CONTENT GOVERNANCE</p><h1>内容治理</h1><span>审核社区打卡与评价，维护首页推荐位与文旅资源展示秩序。</span></div>
        <div className="admin-date"><Sparkles size={16}/>推荐位实时生效</div>
      </div>

      <div className="admin-mini-grid mb-5">
        <div className="admin-mini"><span>社区内容</span><b>{stats.posts}<small>篇</small></b></div>
        <div className="admin-mini"><span>已隐藏</span><b>{stats.hidden}<small>篇</small></b></div>
        <div className="admin-mini"><span>文旅资源</span><b>{stats.resources}<small>条</small></b></div>
        <div className="admin-mini"><span>首页推荐</span><b>{stats.featured}<small>条</small></b></div>
      </div>

      <section className="admin-panel overflow-hidden p-0">
        <div className="admin-toolbar">
          <div className="admin-tabs">
            {filters.map(([value, label]) => <button key={value} className={`admin-tab ${tab === value ? "active" : ""}`} onClick={() => setTab(value)}>{label}</button>)}
          </div>
          <label className="admin-search"><Search size={15}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tab === "posts" ? "搜索标题、正文或作者" : "搜索资源名称、地区或摘要"}/></label>
        </div>
        {message && <p className="border-b border-[#eee5da] bg-[#fdf6f2] px-5 py-2 text-[11px] text-[#a3483b]">{message}</p>}

        <div className="overflow-x-auto">
          {tab === "posts" ? (
            <table className="admin-booking-table min-w-[1000px]">
              <thead><tr><th>社区内容</th><th>作者 / 关联资源</th><th>类型</th><th>互动</th><th>状态</th><th>操作</th></tr></thead>
              <tbody>
                {visiblePosts.map((post) => (
                  <tr key={post.id}>
                    <td><b>{post.title}</b><small>{post.content.slice(0, 48)}{post.content.length > 48 ? "…" : ""}</small></td>
                    <td><b>{post.user.nickname || post.user.username}</b><small>{post.resource.title}</small></td>
                    <td>{post.type === "CHECKIN" ? "打卡" : `评价${post.rating ? ` · ${post.rating} 星` : ""}`}</td>
                    <td><b>{post._count.likes} 赞 · {post._count.comments} 评</b><small>收藏 {post._count.favorites}</small></td>
                    <td><span className={`admin-role ${post.status === "PUBLISHED" ? "merchant" : "admin"}`}>{post.status === "PUBLISHED" ? "展示中" : "已隐藏"}</span></td>
                    <td>
                      {post.status === "PUBLISHED" ? (
                        <button className="admin-action danger" onClick={() => act("post", post.id, "hide", "内容已隐藏，前台不再展示")}><EyeOff size={12}/>隐藏</button>
                      ) : (
                        <button className="admin-action" onClick={() => act("post", post.id, "publish", "内容已恢复展示")}><Eye size={12}/>恢复</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="admin-booking-table min-w-[1000px]">
              <thead><tr><th>文旅资源</th><th>分类 / 地区</th><th>标签</th><th>数据</th><th>首页推荐</th><th>操作</th></tr></thead>
              <tbody>
                {visibleResources.map((resource) => (
                  <tr key={resource.id}>
                    <td><b>{resource.title}</b><small>{resource.summary.slice(0, 52)}{resource.summary.length > 52 ? "…" : ""}</small></td>
                    <td>{typeLabels[resource.type]}<small>{resource.district || "福州市"}</small></td>
                    <td>{resource.tags.slice(0, 3).map((item) => item.tag.name).join(" · ") || "—"}</td>
                    <td><b>{resource._count.favorites} 收藏 · {resource._count.resourceViews} 浏览</b><small>关联内容 {resource._count.communityPosts} 篇</small></td>
                    <td><span className={`admin-role ${resource.recommendationWeight > 0 ? "merchant" : "visitor"}`}>{resource.recommendationWeight > 0 ? "推荐中" : "普通"}</span></td>
                    <td>
                      {resource.recommendationWeight > 0 ? (
                        <button className="admin-action" onClick={() => act("resource", resource.id, "unfeature", "已取消首页推荐")}><Star size={12}/>取消推荐</button>
                      ) : (
                        <button className="admin-action primary" onClick={() => act("resource", resource.id, "feature", "已加入首页推荐")}><Star size={12}/>推荐</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!((tab === "posts" && visiblePosts.length) || (tab === "resources" && visibleResources.length)) && <p className="admin-empty">没有符合条件的内容</p>}
        </div>
      </section>

      <p className="mt-4 text-[10px] leading-relaxed text-[#9a9289]">说明：隐藏内容不会删除数据，恢复后互动记录仍在；首页推荐位按推荐权重排序，权重 100 为推荐、0 为普通。</p>
    </div>
  );
}
