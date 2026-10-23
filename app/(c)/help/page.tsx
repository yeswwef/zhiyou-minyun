/**
 * @module-note app/(c)/help/page.tsx
 * 游客端／便民与应急页面；服务端只做路由入口，定位与查询在客户端组件中完成。
 */
import type { Metadata } from "next";
import { HelpExperience } from "@/features/help/HelpExperience";

export const metadata: Metadata = {
  title: "便民与应急 · 智游闽韵",
  description: "查找附近公共厕所、停车场、充电桩与医疗点，并支持一键求助登记。",
};

export default function HelpPage() {
  return <HelpExperience />;
}
