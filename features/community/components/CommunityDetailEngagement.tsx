"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, Heart, MessageCircle, Send, Trash2, UserPlus } from "lucide-react";
import type { CommunityCommentDto } from "../types";

type Author = {
  id: string;
  username: string;
  nickname: string | null;
};

export function CommunityDetailEngagement({
  postId,
  author,
  viewerId,
  initialLiked,
  initialSaved,
  initialFollowing,
  initialFollowerCount,
  initialCounts,
  initialComments,
  children,
}: {
  postId: string;
  author: Author;
  viewerId: string | null;
  initialLiked: boolean;
  initialSaved: boolean;
  initialFollowing: boolean;
  initialFollowerCount: number;
  initialCounts: { likes: number; favorites: number; comments: number };
  initialComments: CommunityCommentDto[];
  children: ReactNode;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [saved, setSaved] = useState(initialSaved);
  const [following, setFollowing] = useState(initialFollowing);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [counts, setCounts] = useState(initialCounts);
  const [comments, setComments] = useState(initialComments);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const commentInput = useRef<HTMLInputElement>(null);
  const authorName = author.nickname || author.username;
  const isOwner = viewerId === author.id;

  function requireLogin() {
    if (viewerId) return true;
    router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
    return false;
  }

  async function toggle(kind: "like" | "favorite") {
    if (!requireLogin() || busy) return;
    setBusy(kind);
    setError("");
    const response = await fetch(`/api/community/posts/${postId}/${kind}`, { method: "POST" });
    const payload = (await response.json()) as { active?: boolean; count?: number; error?: string };
    setBusy("");
    if (!response.ok) {
      setError(payload.error ?? "操作失败，请稍后重试");
      return;
    }
    if (kind === "like") {
      setLiked(Boolean(payload.active));
      setCounts((value) => ({ ...value, likes: payload.count ?? value.likes }));
    } else {
      setSaved(Boolean(payload.active));
      setCounts((value) => ({ ...value, favorites: payload.count ?? value.favorites }));
    }
  }

  async function toggleFollow() {
    if (!requireLogin() || busy || isOwner) return;
    setBusy("follow");
    setError("");
    const response = await fetch("/api/community/follows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ followingId: author.id }),
    });
    const payload = (await response.json()) as { active?: boolean; count?: number; error?: string };
    setBusy("");
    if (!response.ok) {
      setError(payload.error ?? "关注失败，请稍后重试");
      return;
    }
    setFollowing(Boolean(payload.active));
    setFollowerCount(payload.count ?? followerCount);
  }

  async function publishComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requireLogin() || busy || !content.trim()) return;
    setBusy("comment");
    setError("");
    const response = await fetch(`/api/community/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const payload = (await response.json()) as { data?: CommunityCommentDto; count?: number; error?: string };
    setBusy("");
    if (!response.ok || !payload.data) {
      setError(payload.error ?? "评论发布失败");
      return;
    }
    setComments((value) => [payload.data!, ...value]);
    setCounts((value) => ({ ...value, comments: payload.count ?? value.comments + 1 }));
    setContent("");
  }

  async function deleteComment(commentId: string) {
    if (busy) return;
    setBusy(commentId);
    setError("");
    const response = await fetch(`/api/community/comments/${commentId}`, { method: "DELETE" });
    const payload = (await response.json()) as { count?: number; error?: string };
    setBusy("");
    if (!response.ok) {
      setError(payload.error ?? "删除评论失败");
      return;
    }
    setComments((value) => value.filter((comment) => comment.id !== commentId));
    setCounts((value) => ({ ...value, comments: payload.count ?? Math.max(value.comments - 1, 0) }));
  }

  return (
    <>
      <div className="community-story-author">
        <Link href={`/community/users/${author.id}`} className="community-story-author-link">
          <span className="community-story-avatar">{authorName.slice(0, 1)}</span>
          <div><strong>{authorName}</strong><small>{followerCount} 位粉丝 · 查看主页</small></div>
        </Link>
        {!isOwner && (
          <button className={following ? "following" : ""} onClick={toggleFollow} disabled={busy === "follow"}>
            <UserPlus size={15} />{following ? "已关注" : "关注"}
          </button>
        )}
      </div>

      {children}

      <section className="community-comments">
        <h2>评论 <small>{counts.comments}</small></h2>
        <form onSubmit={publishComment}>
          <input
            ref={commentInput}
            value={content}
            maxLength={500}
            onChange={(event) => setContent(event.target.value)}
            onFocus={() => requireLogin()}
            placeholder={viewerId ? "说点什么吧……" : "登录后参与评论"}
          />
          <button type="submit" disabled={busy === "comment" || !content.trim()}><Send size={15} />发布</button>
        </form>
        {error && <p className="community-engagement-error">{error}</p>}
        <div className="community-comment-list">
          {comments.length ? comments.map((comment) => {
            const name = comment.author.nickname || comment.author.username;
            return (
              <article key={comment.id}>
                <span>{name.slice(0, 1)}</span>
                <div>
                  <Link className="community-comment-author" href={`/community/users/${comment.author.id}`}>{name}</Link>
                  <p>{comment.content}</p>
                  <small>{new Date(comment.createdAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</small>
                </div>
                {viewerId === comment.author.id && (
                  <button aria-label="删除评论" onClick={() => deleteComment(comment.id)} disabled={busy === comment.id}><Trash2 size={14} /></button>
                )}
              </article>
            );
          }) : <p className="community-comments-empty">还没有评论，来坐第一排吧。</p>}
        </div>
      </section>

      <div className="community-story-actions">
        <button className={liked ? "active" : ""} onClick={() => toggle("like")} disabled={busy === "like"}>
          <Heart size={23} fill={liked ? "currentColor" : "none"} /><span>{counts.likes}</span><small>点赞</small>
        </button>
        <button className={saved ? "active" : ""} onClick={() => toggle("favorite")} disabled={busy === "favorite"}>
          <Bookmark size={23} fill={saved ? "currentColor" : "none"} /><span>{counts.favorites}</span><small>收藏</small>
        </button>
        <button onClick={() => commentInput.current?.focus()}>
          <MessageCircle size={23} /><span>{counts.comments}</span><small>评论</small>
        </button>
      </div>
    </>
  );
}
