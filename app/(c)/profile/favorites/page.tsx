"use client";

import { useEffect, useState } from "react";
import { ResourceCard } from "@/features/destination-resources/components/ResourceCard";
import { DESTINATION_RESOURCES } from "@/features/destination-resources/data";

export default function FavoritesPage() { const [ids, setIds] = useState<string[]>([]); useEffect(() => { setIds(JSON.parse(localStorage.getItem("zhiyou-minyun-favorites") || "[]")); }, []); const resources = DESTINATION_RESOURCES.filter((resource) => ids.includes(resource.id)); return <main className="resource-page"><header className="resource-header"><div><p className="section-kicker">MY COLLECTION</p><h1>我的收藏</h1><p>收藏的景点、非遗和美食会显示在这里。</p></div><a href="/resources" className="resource-back">继续探索</a></header><section className="resource-results">{resources.length ? <div className="resource-grid">{resources.map((resource) => <ResourceCard resource={resource} key={resource.id} />)}</div> : <div className="resource-empty">还没有收藏内容，去资源中心看看吧。</div>}</section></main>; }
