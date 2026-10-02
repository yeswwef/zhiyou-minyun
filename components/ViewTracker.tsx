"use client";

import { useEffect } from "react";

/** 资源详情页埋点：浏览足迹记录（未登录时接口端会忽略） */
export function ViewTracker({ resourceId }: { resourceId: string }) {
  useEffect(() => {
    fetch("/api/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resourceId }),
    }).catch(() => {});
  }, [resourceId]);

  return null;
}
