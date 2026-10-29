/**
 * @module-note app/(c)/recognition/page.tsx
 * 游客端／AI 图片识景页面；服务端只做路由入口，图片与模型调用在接口中完成。
 */
import type { Metadata } from "next";
import { RecognitionExperience } from "@/features/recognition/RecognitionExperience";

export const metadata: Metadata = {
  title: "AI 图片识景 · 智游闽韵",
  description: "上传福州任意景点照片，识别对象并获取历史背景、非遗知识点与来源。",
};

export default function RecognitionPage() {
  return <RecognitionExperience />;
}
