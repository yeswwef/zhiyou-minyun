"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

export function CommunityPostActions({ postId }: { postId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (!window.confirm("确定删除这条内容吗？删除后无法恢复。")) return;
    setBusy(true);
    setError("");
    const response = await fetch(`/api/community/posts/${postId}`, { method: "DELETE" });
    const payload = (await response.json()) as { error?: string };
    if (response.ok) {
      router.push("/community/mine");
      router.refresh();
      return;
    }
    setBusy(false);
    setError(payload.error ?? "删除失败");
  }

  return (
    <div className="community-owner-actions">
      <Link href={`/community/${postId}/edit`}><Pencil size={16} />编辑</Link>
      <button type="button" disabled={busy} onClick={remove}><Trash2 size={16} />{busy ? "删除中" : "删除"}</button>
      {error && <small>{error}</small>}
    </div>
  );
}
