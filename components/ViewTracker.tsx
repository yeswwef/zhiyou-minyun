/**
 * @module-note components/ViewTracker.tsx
 * 共享界面组件：接收页面数据或处理局部交互，避免每个页面重复实现。
 */
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
