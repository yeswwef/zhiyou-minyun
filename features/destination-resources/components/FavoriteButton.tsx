/**
 * @module-note features/destination-resources/components/FavoriteButton.tsx
 * 文旅资源展示与交互：资源卡片连接收藏、行程及详情入口。
 */
"use client";

import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * 渲染features／destination-resources／components／FavoriteButton.tsx界面及其子组件。
 * 接口协作：/api/favorites?resourceId=${encodeURIComponent(resourceId)}、/api/favorites。
 */
export function FavoriteButton({ resourceId }: { resourceId: string }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);
  const [hint, setHint] = useState("");

  useEffect(() => {
    fetch(`/api/favorites?resourceId=${encodeURIComponent(resourceId)}`)
      .then((response) => response.json())
      .then((payload: { saved?: boolean; loggedIn?: boolean }) => {
        if (payload.loggedIn) setSaved(!!payload.saved);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, [resourceId]);

  /**
   * 切换当前条目的操作状态，并根据接口结果更新界面。
   * 接口协作：/api/favorites。
   */
  async function toggle() {
    setHint("");
    const response = await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resourceId }),
    });

    if (response.status === 401) {
      router.push("/login");
      return;
    }

    const payload = (await response.json()) as {
      ok?: boolean;
      saved?: boolean;
      error?: string;
    };
    if (payload.ok) {
      setSaved(!!payload.saved);
      return;
    }
    setHint(payload.error ?? "操作失败");
  }

  return (
    <>
      <button
        className={`detail-action ${saved ? "saved" : ""}`}
        onClick={toggle}
        disabled={!ready}
      >
        <Heart size={16} fill={saved ? "currentColor" : "none"} />
        {saved ? "已收藏" : "收藏"}
      </button>
      {hint && <span className="self-center text-xs text-brand">{hint}</span>}
    </>
  );
}
