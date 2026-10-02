"use client";

import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function FavoriteButton({ resourceId }: { resourceId: string }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch(`/api/favorites?resourceId=${encodeURIComponent(resourceId)}`)
      .then((response) => response.json())
      .then((payload: { saved?: boolean; loggedIn?: boolean }) => {
        if (payload.loggedIn) setSaved(!!payload.saved);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, [resourceId]);

  async function toggle() {
    const response = await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resourceId }),
    });

    if (response.status === 401) {
      router.push("/login");
      return;
    }

    const payload = (await response.json()) as { ok?: boolean; saved?: boolean };
    if (payload.ok) setSaved(!!payload.saved);
  }

  return (
    <button
      className={`detail-action ${saved ? "saved" : ""}`}
      onClick={toggle}
      disabled={!ready}
    >
      <Heart size={16} fill={saved ? "currentColor" : "none"} />
      {saved ? "已收藏" : "收藏"}
    </button>
  );
}
