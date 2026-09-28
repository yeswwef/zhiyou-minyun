import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "智游闽韵 · 福建文旅智能平台",
  description:
    "立足福建本土文旅资源的智能化平台：AI 文化问答、行程规划、资源检索、多模态识景与商户后台。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full bg-paper font-sans text-ink">{children}</body>
    </html>
  );
}
