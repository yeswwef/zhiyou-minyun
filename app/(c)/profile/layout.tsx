/**
 * @module-note app/(c)/profile/layout.tsx
 * 游客端／用户中心布局。服务端路由入口负责组装页面或跳转，复杂交互委托给客户端组件。
 */
import { ProfileSidebar } from "@/components/ProfileSidebar";
import { ProfileTopbar } from "@/components/ProfileTopbar";

/** 个人中心布局：蓝色顶栏 + 左侧竖向菜单 + 右侧内容区 */
export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="uc-page">
      <ProfileTopbar />
      <div className="uc-body">
        <ProfileSidebar />
        <main className="uc-main">{children}</main>
      </div>
    </div>
  );
}
