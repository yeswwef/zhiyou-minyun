"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, UserCheck, UsersRound } from "lucide-react";

type FollowUser = {
  id: string;
  username: string;
  nickname: string | null;
  followedByMe: boolean;
  followedAt: string;
  _count: { followers: number; communityPosts: number };
};

export function ProfileFollowList({ mode }: { mode: "following" | "followers" }) {
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const isFollowingPage = mode === "following";

  useEffect(() => {
    fetch(`/api/community/follows?mode=${mode}`)
      .then(async (response) => {
        const payload = (await response.json()) as { data?: FollowUser[]; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "加载失败");
        setUsers(payload.data ?? []);
      })
      .catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : "加载失败"))
      .finally(() => setLoading(false));
  }, [mode]);

  async function toggleFollow(user: FollowUser) {
    setBusyId(user.id);
    setError("");
    const response = await fetch("/api/community/follows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ followingId: user.id }),
    });
    const payload = (await response.json()) as { active?: boolean; error?: string };
    setBusyId("");
    if (!response.ok) {
      setError(payload.error ?? "操作失败");
      return;
    }
    if (isFollowingPage && !payload.active) {
      setUsers((current) => current.filter((item) => item.id !== user.id));
    } else {
      setUsers((current) => current.map((item) => item.id === user.id ? { ...item, followedByMe: Boolean(payload.active) } : item));
    }
  }

  return (
    <>
      <div className="profile-page-head">
        <div>
          <h1>{isFollowingPage ? "我的关注" : "我的粉丝"}</h1>
          <p>{isFollowingPage ? "查看你感兴趣的社区创作者及其发布。" : "查看关注你的用户，也可以选择回关。"}</p>
        </div>
        <Link href="/community" className="profile-head-link">浏览文旅社区</Link>
      </div>
      <div className="profile-page-body">
        {loading ? <div className="profile-empty">正在加载……</div> : error ? (
          <div className="profile-empty">{error}</div>
        ) : users.length ? (
          <div className="profile-follow-grid">
            {users.map((user) => {
              const name = user.nickname || user.username;
              return (
                <article className="profile-follow-card" key={user.id}>
                  <span className="profile-follow-avatar">{name.slice(0, 1)}</span>
                  <div className="profile-follow-info">
                    <h2>{name}</h2><small>@{user.username}</small>
                    <p><UsersRound size={13} />{user._count.followers} 粉丝 <FileText size={13} />{user._count.communityPosts} 篇发布</p>
                  </div>
                  <div className="profile-follow-actions">
                    <Link href={`/community/users/${encodeURIComponent(user.id)}`}>查看主页</Link>
                    <button className={user.followedByMe ? "active" : ""} onClick={() => toggleFollow(user)} disabled={busyId === user.id}>
                      <UserCheck size={14} />{user.followedByMe ? "已关注" : "关注"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="profile-empty">{isFollowingPage ? "还没有关注任何创作者。" : "暂时还没有粉丝。"}</div>
        )}
      </div>
    </>
  );
}
