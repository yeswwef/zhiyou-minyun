/**
 * @module-note features/community/components/FollowButton.tsx
 * 社区业务：围绕帖子、图片、评价与关注关系组织数据及交互。
 */
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { UserPlus } from "lucide-react";

/**
 * 渲染features／社区／components／FollowButton.tsx界面及其子组件。
 * 接口协作：/api/community/follows。
 */
export function FollowButton({
  userId,
  viewerId,
  initialFollowing,
}: {
  userId: string;
  viewerId: string | null;
  initialFollowing: boolean;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  /**
   * 切换当前条目的操作状态，并根据接口结果更新界面。
   * 接口协作：/api/community/follows。
   */
  async function toggle() {
    if (!viewerId) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (viewerId === userId || busy) return;
    setBusy(true);
    const response = await fetch("/api/community/follows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ followingId: userId }),
    });
    const payload = (await response.json()) as { active?: boolean };
    setBusy(false);
    if (response.ok) {
      setFollowing(Boolean(payload.active));
      router.refresh();
    }
  }

  return (
    <button className={`community-creator-follow ${following ? "following" : ""}`} onClick={toggle} disabled={busy}>
      <UserPlus size={18} />{following ? "已关注" : "关注"}
    </button>
  );
}
