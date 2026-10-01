"use client";

import { Heart } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "zhiyou-minyun-favorites";
export function FavoriteButton({ resourceId }: { resourceId: string }) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const ids = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]",
    ) as string[];

    setSaved(ids.includes(resourceId));
  }, [resourceId]);

  function toggle() {
    const ids = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]",
    ) as string[];

    const next = ids.includes(resourceId)
      ? ids.filter((id) => id !== resourceId)
      : [...ids, resourceId];

    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSaved(next.includes(resourceId));
  }

  return (
    <button
      className={`detail-action ${saved ? "saved" : ""}`}
      onClick={toggle}
    >
      <Heart
        size={16}
        fill={saved ? "currentColor" : "none"}
      />
      {saved ? "已收藏" : "收藏"}
    </button>
  );
}
