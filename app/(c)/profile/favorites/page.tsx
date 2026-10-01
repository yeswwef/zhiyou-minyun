"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ResourceCard } from "@/features/destination-resources/components/ResourceCard";
import type { DestinationResource } from "@/features/destination-resources/types";

export default function FavoritesPage() {
  const [resources, setResources] = useState<DestinationResource[]>([]);

  useEffect(() => {
    const savedIds = JSON.parse(
      localStorage.getItem("zhiyou-minyun-favorites") || "[]",
    ) as string[];

    fetch("/api/resources?limit=100")
      .then((response) => response.json())
      .then((payload: { data?: DestinationResource[] }) => {
        setResources(
          (payload.data ?? []).filter((resource) => savedIds.includes(resource.id)),
        );
      });
  }, []);

  return (
    <main className="resource-page">
      <header className="resource-header">
        <div>
          <p className="section-kicker">MY COLLECTION</p>
          <h1>我的收藏</h1>
          <p>收藏的景点、非遗和美食会显示在这里。</p>
        </div>

        <Link href="/resources" className="resource-back">
          继续探索
        </Link>
      </header>

      <section className="resource-results">
        {resources.length ? (
          <div className="resource-grid">
            {resources.map((resource) => (
              <ResourceCard
                resource={resource}
                key={resource.id}
              />
            ))}
          </div>
        ) : (
          <div className="resource-empty">
            还没有收藏内容，去资源中心看看吧。
          </div>
        )}
      </section>
    </main>
  );
}
