"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { ResourceCard } from "@/features/destination-resources/components/ResourceCard";
import { DESTINATION_RESOURCES, RESOURCE_TAGS } from "@/features/destination-resources/data";
import type { ResourceCategory } from "@/features/destination-resources/types";

const categories: Array<"全部" | ResourceCategory> = ["全部", "景点", "非遗", "美食"];

export default function ResourcesPage() {
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("全部");
  const [tag, setTag] = useState("全部标签");
  const filtered = useMemo(() => DESTINATION_RESOURCES.filter((resource) => {
    const text = `${resource.name} ${resource.summary} ${resource.district} ${resource.tags.join(" ")}`;
    return (!keyword || text.includes(keyword.trim())) && (category === "全部" || resource.category === category) && (tag === "全部标签" || resource.tags.includes(tag));
  }), [keyword, category, tag]);
  return <main className="resource-page"><header className="resource-site-nav"><a href="/home" className="resource-brand"><span>闽</span><strong>智游闽韵</strong><small>FUZHOU TRAVEL</small></a><nav><a className="active" href="/resources">发现</a><a href="/home#plan">行程</a><a href="/home#stories">游记</a><a href="/profile/favorites">我的收藏</a></nav><a href="/home" className="resource-user">返回首页</a></header><header className="resource-header"><div><p className="section-kicker">DESTINATION RESOURCE</p><h1>探索福州</h1><p>景点、非遗与美食，找到你想去的地方。</p></div><a href="/home" className="resource-back">返回首页</a></header><section className="resource-toolbar"><div className="resource-search"><Search size={18} /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索景点、美食、非遗或区域" /></div><div className="resource-filter-row"><div className="category-tabs">{categories.map((item) => <button className={category === item ? "selected" : ""} key={item} onClick={() => setCategory(item)}>{item}</button>)}</div><label className="tag-select"><SlidersHorizontal size={15} /><select value={tag} onChange={(event) => setTag(event.target.value)}><option>全部标签</option>{RESOURCE_TAGS.map((item) => <option key={item}>{item}</option>)}</select></label></div>{(keyword || tag !== "全部标签" || category !== "全部") && <button className="clear-filter" onClick={() => { setKeyword(""); setTag("全部标签"); setCategory("全部"); }}><X size={14} />清除筛选</button>}</section><section className="resource-results"><div className="resource-result-heading"><h2>福州文旅资源</h2><span>共 {filtered.length} 项</span></div>{filtered.length ? <div className="resource-grid">{filtered.map((resource) => <ResourceCard resource={resource} key={resource.id} />)}</div> : <div className="resource-empty">没有找到匹配的资源，试试其他关键词或标签。</div>}</section></main>;
}
