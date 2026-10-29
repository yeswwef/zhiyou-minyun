/**
 * @module-note app/admin/layout.tsx
 * 平台管理中心布局：深绿侧栏 + 分组导航 + 全域后台工作区。
 */
import Link from "next/link";
import type { Metadata } from "next";
import { Bell, LogOut, ShieldCheck } from "lucide-react";
import { PageTransition } from "@/components/motion/PageTransition";
import { AdminSidebarNav } from "@/components/admin/AdminSidebarNav";
import { BrandMark } from "@/components/BrandMark";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "平台管理中心 · 智游闽韵",
  description: "智游闽韵平台管理中心：账号、内容、商户、票务、应急与 AI 运营。",
};

/**
 * 渲染平台管理中心界面及其子组件。
 * 接口协作：/api/auth/logout。
 * 依赖当前会话身份，匿名访问和角色限制由下方分支处理。
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "TICKET_ADMIN")) {
    redirect("/login?endpoint=admin&next=/admin/dashboard");
  }
  const isTicket = user.role === "TICKET_ADMIN";
  const pendingEmergency = isTicket
    ? await prisma.emergencyRequest.count({ where: { status: "pending" } }).catch(() => 0)
    : 0;
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link href={isTicket ? "/admin/tickets" : "/admin/dashboard"} className="admin-brand">
          <span><BrandMark size={24} /></span>
          <span><strong>智游闽韵</strong><small>{isTicket ? "景点工作台" : "平台管理中心"}</small></span>
        </Link>
        <div className="admin-sidebar-caption">{isTicket ? "ATTRACTION OPERATIONS" : "PLATFORM GOVERNANCE"}</div>
        <AdminSidebarNav role={user.role} />
        <div className="admin-sidebar-foot"><ShieldCheck size={16}/><span><b>{isTicket ? "景点服务正常" : "平台服务正常"}</b><small>{isTicket ? "场馆、预约与核销接口已连接" : "数据、AI 与地图服务已连接"}</small></span></div>
      </aside>
      <div className="admin-content">
        <header className="admin-topbar">
          <div><p>{isTicket ? "智游闽韵 · 景点工作台" : "智游闽韵 · 平台管理中心"}</p><span>{isTicket ? "ZHIYOU MINYUN · ATTRACTION OPERATIONS" : "ZHIYOU MINYUN · GOVERNANCE CONSOLE"}</span></div>
          <div className="admin-account">
            {isTicket && (
              <Link href="/admin/emergency" className="admin-bell" aria-label="查看待处理应急工单" title={pendingEmergency ? `${pendingEmergency} 条待处理应急工单` : "暂无待处理工单"}><Bell size={17}/>{pendingEmergency > 0 && <i />}</Link>
            )}
            <span className="admin-avatar">{isTicket ? "景" : "管"}</span><span><b>{user.nickname||user.username}</b><small>{isTicket ? "景点管理员" : "平台管理员"}</small></span><Link href="/api/auth/logout"><LogOut size={15}/>退出</Link>
          </div>
        </header>
        <main className="admin-workspace"><div className="admin-watermark" aria-hidden="true">{isTicket ? "景" : "福"}</div><PageTransition>{children}</PageTransition></main>
      </div>
    </div>
  );
}
