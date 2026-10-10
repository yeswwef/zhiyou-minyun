import Link from "next/link";
import { Bell, LogOut, ShieldCheck } from "lucide-react";
import { PageTransition } from "@/components/motion/PageTransition";
import { AdminSidebarNav } from "@/components/admin/AdminSidebarNav";
import { BrandMark } from "@/components/BrandMark";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") redirect("/login?endpoint=admin&next=/admin/dashboard");
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/admin/dashboard" className="admin-brand">
          <span><BrandMark size={24} /></span>
          <span><strong>智游闽韵</strong><small>文旅运营管理平台</small></span>
        </Link>
        <div className="admin-sidebar-caption">PLATFORM CONSOLE</div>
        <AdminSidebarNav />
        <div className="admin-sidebar-foot"><ShieldCheck size={16}/><span><b>系统服务正常</b><small>数据连接与票务接口在线</small></span></div>
      </aside>
      <div className="admin-content">
        <header className="admin-topbar">
          <div><p>福州文旅票务中心</p><span>FUZHOU CULTURE & TRAVEL</span></div>
          <div className="admin-account"><button aria-label="通知"><Bell size={17}/><i /></button><span className="admin-avatar">管</span><span><b>{user.nickname||user.username}</b><small>平台管理员</small></span><Link href="/api/auth/logout"><LogOut size={15}/>退出</Link></div>
        </header>
        <main className="admin-workspace"><div className="admin-watermark" aria-hidden="true">福</div><PageTransition>{children}</PageTransition></main>
      </div>
    </div>
  );
}
