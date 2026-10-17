/**
 * @module-note app/(c)/ask/page.tsx
 * 游客端／AI文化问答页面。服务端路由入口负责组装页面或跳转，复杂交互委托给客户端组件。
 */
import type { Metadata } from "next";
import { AskExperience } from "@/features/ai-chat/AskExperience";

export const metadata: Metadata = { title: "AI 文化问答 · 智游闽韵" };

/**
 * 读取网址中的初始问题并交给 AskExperience 渲染；这里只负责路由入口，不执行模型检索。
 */
export default async function AskPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const { q } = await searchParams;
  return <AskExperience initialQuestion={typeof q === "string" ? q.slice(0, 1000) : ""} />;
}
