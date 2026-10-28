/**
 * @module-note app/b/layout.tsx
 * 商户端布局。沿用票务中心的后台视觉语言：深绿侧栏、米色工作区、衬线标题。
 */
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  Sparkles,
  Store,
} from "lucide-react";
import { PageTransition } from "@/components/motion/PageTransition";
import { BrandMark } from "@/components/BrandMark";

const NAV = [
  { href: "/b/dashboard", label: "经营看板", description: "经营数据", icon: LayoutDashboard },
  { href: "/b/products", label: "商品管理", description: "商品与库存", icon: Package },
  { href: "/b/orders", label: "订单核销", description: "现场核销", icon: ClipboardList },
  { href: "/b/studio", label: "非遗工作室", description: "作品与课程", icon: Sparkles },
  { href: "/b/settings", label: "账户设置", description: "店铺资料", icon: Settings },
];

/** B 端商户后台外壳：左侧菜单 + 顶部栏 */
export default function BLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [shopName, setShopName] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then(
        (payload: {
          user: { nickname: string | null; username: string; merchantName: string | null } | null;
        }) => {
          const user = payload.user;
          if (user) {
            setShopName(user.merchantName || user.nickname || user.username);
          }
        },
      )
      .catch(() => {});
  }, []);

  /**
   * 请求退出登录并跳转到登录页。
   * 接口协作：/api/auth/logout。
   */
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/b/dashboard" className="admin-brand">
          <span><BrandMark size={24} /></span>
          <span><strong>智游闽韵</strong><small>商户工作台</small></span>
        </Link>
        <div className="admin-sidebar-caption">MERCHANT CONSOLE</div>
        <nav className="admin-nav" aria-label="商户端导航">
          {NAV.map(({ href, label, description, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link key={href} href={href} className={active ? "active" : ""}>
                <span className="admin-nav-icon"><Icon size={18} /></span>
                <span><b>{label}</b><small>{description}</small></span>
              </Link>
            );
          })}
        </nav>
        <div className="admin-sidebar-foot">
          <Store size={16} />
          <span><b>商户服务正常</b><small>商品、订单与课程接口在线</small></span>
        </div>
      </aside>

      <div className="admin-content">
        <header className="admin-topbar">
          <div>
            <p>商户工作台</p>
            <span>FUZHOU MERCHANT CONSOLE</span>
          </div>
          <div className="admin-account">
            <span className="admin-avatar">商</span>
            <span>
              <b>{shopName || "未登录"}</b>
              <small>认证商户</small>
            </span>
            <button type="button" className="admin-logout" onClick={logout}>
              <LogOut size={15} />退出
            </button>
          </div>
        </header>
        <main className="admin-workspace">
          <div className="admin-watermark" aria-hidden="true">商</div>
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
