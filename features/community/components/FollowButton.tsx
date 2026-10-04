"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { UserPlus } from "lucide-react";

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
