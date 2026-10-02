"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ResourceCard } from "@/features/destination-resources/components/ResourceCard";
import type { DestinationResource } from "@/features/destination-resources/types";

type Footprint = DestinationResource & { viewedAt: string };

export default function FootprintsPage() {
  const [items, setItems] = useState<Footprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(true);

  useEffect(() => {
    fetch("/api/views")
      .then((response) => response.json())
      .then((payload: { data?: Footprint[]; loggedIn?: boolean }) => {
        setItems(payload.data ?? []);
        setLoggedIn(!!payload.loggedIn);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="profile-page-head">
        <h1>我的足迹</h1>
        <p>最近浏览过的景点、非遗与美食。</p>
      </div>

      <div className="profile-page-body">
        {loading ? (
          <div className="profile-empty">正在加载……</div>
        ) : !loggedIn ? (
          <div className="profile-empty">
            请先 <Link href="/login">登录</Link> 后查看足迹。
          </div>
        ) : items.length ? (
          <div className="resource-grid">
            {items.map((item) => (
              <ResourceCard resource={item} key={item.id} />
            ))}
          </div>
        ) : (
          <div className="profile-empty">还没有浏览记录，去资源中心逛逛吧。</div>
        )}
      </div>
    </>
  );
}
