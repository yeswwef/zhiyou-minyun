/**
 * @module-note app/layout.tsx
 * 应用根布局。服务端路由入口负责组装页面或跳转，复杂交互委托给客户端组件。
 */
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "智游闽韵 · 福建文旅智能平台",
  description:
    "立足福建本土文旅资源的智能化平台：AI 文化问答、行程规划、资源检索、图片识景与商户后台。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

/**
 * 渲染界面及其子组件。
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full bg-paper font-sans text-ink">{children}</body>
    </html>
  );
}
