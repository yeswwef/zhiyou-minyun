"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ResourceCard } from "@/features/destination-resources/components/ResourceCard";
import type { DestinationResource } from "@/features/destination-resources/types";

export default function FavoritesPage() {
  const [resources, setResources] = useState<DestinationResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(true);

  useEffect(() => {
    fetch("/api/favorites")
      .then((response) => response.json())
      .then((payload: { data?: DestinationResource[]; loggedIn?: boolean }) => {
        setResources(payload.data ?? []);
        setLoggedIn(!!payload.loggedIn);
      })
      .catch(() => setResources([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="profile-page-head">
        <div>
          <h1>我的收藏</h1>
          <p>收藏的景点、非遗和美食会显示在这里。</p>
        </div>
        <Link href="/resources" className="profile-head-link">
          继续探索
        </Link>
      </div>

      <div className="profile-page-body">
        {loading ? (
          <div className="profile-empty">正在加载收藏……</div>
        ) : !loggedIn ? (
          <div className="profile-empty">
            请先 <Link href="/login">登录</Link> 后查看收藏。
          </div>
        ) : resources.length ? (
          <div className="resource-grid">
            {resources.map((resource) => (
              <ResourceCard resource={resource} key={resource.id} />
            ))}
          </div>
        ) : (
          <div className="profile-empty">还没有收藏内容，去资源中心看看吧。</div>
        )}
      </div>
    </>
  );
}
