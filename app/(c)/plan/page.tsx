/**
 * @module-note app/(c)/plan/page.tsx
 * 游客端／智能行程规划页面；读取分享参数与模板参数，交给客户端组件渲染。
 */
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { ItineraryPlanner } from "@/features/itinerary/ItineraryPlanner";
import type { ItineraryTemplate } from "@/features/itinerary/templates";

export const metadata: Metadata = {
  title: "智能行程规划 · 智游闽韵",
  description: "福州主题套餐行程推荐与 AI 个性化路线生成，支持路线图、保存到我的行程与分享。",
};

/** 分享 id 只允许字面量字符，避免把任意字符串当查询条件。 */
const SHARE_ID = /^[A-Za-z0-9_-]{8,40}$/;

/** 读取分享快照；失败时返回错误文案而不是让页面崩溃。 */
async function loadSharedPlan(id: string | undefined) {
  if (!id || !SHARE_ID.test(id)) return { plan: null, error: "" };
  try {
    const row = await prisma.sharedPlan.findUnique({ where: { id } });
    if (!row) return { plan: null, error: "分享的行程不存在或已失效" };
    return { plan: row.plan as unknown as ItineraryTemplate, error: "" };
  } catch {
    return { plan: null, error: "分享的行程读取失败，请稍后重试" };
  }
}

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string | string[]; share?: string | string[] }>;
}) {
  const { template, share } = await searchParams;
  const templateId = typeof template === "string" ? template : undefined;
  const shared = await loadSharedPlan(typeof share === "string" ? share : undefined);

  return (
    <ItineraryPlanner
      initialTemplateId={templateId}
      initialSharedPlan={shared.plan}
      shareError={shared.error}
    />
  );
}
