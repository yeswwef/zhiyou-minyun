"use client";

import { useEffect } from "react";

const STORAGE_KEY = "zhiyou-minyun-favorites";
const MIGRATION_KEY = "zhiyou-minyun-favorites-migrated";

/** 把旧版浏览器本地收藏安全地合并进已登录用户的数据库收藏。 */
export function LegacyFavoritesMigration() {
  useEffect(() => {
    if (localStorage.getItem(MIGRATION_KEY) === "1") return;

    let resourceIds: string[];
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      resourceIds = Array.isArray(stored)
        ? stored.filter((id): id is string => typeof id === "string")
        : [];
    } catch {
      resourceIds = [];
    }

    fetch("/api/favorites", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resourceIds }),
    })
      .then((response) => {
        if (response.ok) {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.setItem(MIGRATION_KEY, "1");
        }
      })
      .catch(() => {});
  }, []);

  return null;
}
