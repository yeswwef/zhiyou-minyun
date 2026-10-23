/**
 * @module-note app/(c)/plan/page.tsx
 * 游客端／智能行程规划页面；读取分享参数并交给客户端组件渲染。
 */
import type { Metadata } from "next";
import { ItineraryPlanner } from "@/features/itinerary/ItineraryPlanner";

export const metadata: Metadata = {
  title: "智能行程规划 · 智游闽韵",
  description: "福州主题套餐行程推荐与 AI 个性化路线生成，支持路线图、保存到我的行程与分享。",
};

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ template?: string | string[] }> }) {
  const { template } = await searchParams;
  return <ItineraryPlanner initialTemplateId={typeof template === "string" ? template : undefined} />;
}
