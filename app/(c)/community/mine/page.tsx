/**
 * @module-note app/(c)/community/mine/page.tsx
 * 游客端／社区／我的内容页面。服务端路由入口负责组装页面或跳转，复杂交互委托给客户端组件。
 */
import { redirect } from "next/navigation";

/**
 * 渲染游客端／社区／我的内容界面及其子组件。
 */
export default function LegacyCommunityMinePage() {
  redirect("/profile/posts");
}
