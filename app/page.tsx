/**
 * @module-note app/page.tsx
 * 应用根页面。服务端路由入口负责组装页面或跳转，复杂交互委托给客户端组件。
 */
import { redirect } from "next/navigation";

/** 根路径：不再有入口页，直接以访客身份进入 C 端首页 */
export default function RootPage() {
  redirect("/home");
}
