/**
 * @module-note app/(c)/profile/following/page.tsx
 * 游客端／用户中心／关注列表页面。服务端路由入口负责组装页面或跳转，复杂交互委托给客户端组件。
 */
import { ProfileFollowList } from "@/features/community/components/ProfileFollowList";

/**
 * 渲染游客端／用户中心／关注列表界面及其子组件。
 */
export default function FollowingPage() {
  return <ProfileFollowList mode="following" />;
}
