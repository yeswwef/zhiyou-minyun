"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark, MapPinned } from "lucide-react";
import { ResourceCard } from "@/features/destination-resources/components/ResourceCard";
import { CommunityPostCard } from "@/features/community/components/CommunityPostCard";
import type { DestinationResource } from "@/features/destination-resources/types";
import type { CommunityPostDto } from "@/features/community/types";

export default function FavoritesPage() {
  const [resources, setResources] = useState<DestinationResource[]>([]);
  const [community, setCommunity] = useState<CommunityPostDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(true);

  useEffect(() => {
    fetch("/api/favorites")
      .then((response) => response.json())
      .then((payload: { data?: DestinationResource[]; community?: CommunityPostDto[]; loggedIn?: boolean }) => {
        setResources(payload.data ?? []);
        setCommunity(payload.community ?? []);
        setLoggedIn(Boolean(payload.loggedIn));
      })
      .catch(() => {
        setResources([]);
        setCommunity([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="profile-page-head">
        <div>
          <h1>我的收藏</h1>
          <p>文旅资源与社区内容分区保存，查找更清晰。</p>
        </div>
        <Link href="/community" className="profile-head-link">继续探索</Link>
      </div>

      {loading ? (
        <div className="profile-page-body"><div className="profile-empty">正在加载收藏……</div></div>
      ) : !loggedIn ? (
        <div className="profile-page-body"><div className="profile-empty">请先 <Link href="/login">登录</Link> 后查看收藏。</div></div>
      ) : (
        <div className="profile-favorite-sections">
          <section className="profile-favorite-section">
            <header><div><MapPinned size={20} /><h2>文旅资源收藏</h2></div><span>{resources.length} 项</span></header>
            <p>来自文旅资源推荐模块的景点、非遗和美食。</p>
            {resources.length ? (
              <div className="resource-grid">
                {resources.map((resource) => <ResourceCard resource={resource} key={resource.id} />)}
              </div>
            ) : <div className="profile-empty">还没有收藏文旅资源。</div>}
          </section>

          <section className="profile-favorite-section community-saved-section">
            <header><div><Bookmark size={20} /><h2>文旅社区收藏</h2></div><span>{community.length} 篇</span></header>
            <p>你收藏的用户打卡与评价。</p>
            {community.length ? (
              <div className="profile-community-favorites">
                {community.map((post) => <CommunityPostCard post={post} key={post.id} />)}
              </div>
            ) : <div className="profile-empty">还没有收藏社区内容。</div>}
          </section>
        </div>
      )}
    </>
  );
}
