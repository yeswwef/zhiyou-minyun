/**
 * @module-note app/(c)/community/layout.tsx
 * 游客端／社区布局。服务端路由入口负责组装页面或跳转，复杂交互委托给客户端组件。
 */
import { CommunityShell } from "@/features/community/components/CommunityShell";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * 渲染游客端／社区界面及其子组件。
 * 依赖当前会话身份，匿名访问和角色限制由下方分支处理。
 */
export default async function CommunityLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  return <CommunityShell user={user}>{children}</CommunityShell>;
}
