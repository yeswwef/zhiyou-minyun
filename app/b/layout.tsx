/**
 * @module-note app/b/layout.tsx
 * 商户端布局。客户端组件负责状态与交互，数据经接口获取；不要在此放服务端密钥。
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
} from "lucide-react";
import { PageTransition } from "@/components/motion/PageTransition";

const NAV = [
  { href: "/b/dashboard", label: "经营看板", icon: LayoutDashboard },
  { href: "/b/products", label: "商品管理", icon: Package },
  { href: "/b/orders", label: "订单核销", icon: ClipboardList },
  { href: "/b/studio", label: "非遗工作室", icon: Sparkles },
  { href: "/b/settings", label: "账户设置", icon: Settings },
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
   * 请求退出登录并跳转到登录或首页入口。
   * 接口协作：/api/auth/logout。
   */
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen w-full bg-[#f6f7f5] text-ink">
      <aside className="hidden w-60 shrink-0 border-r border-stone-200 bg-white p-5 md:block">
        <Link
          href="/b/dashboard"
          className="mb-9 block font-serif text-lg font-bold"
        >
          智游闽韵{" "}
          <span className="font-sans text-xs font-normal text-stone-400">
            商户端
          </span>
        </Link>
        <nav className="space-y-1 text-sm">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition ${
                pathname === href
                  ? "bg-brand-soft font-semibold text-brand"
                  : "text-stone-600 hover:bg-stone-100 hover:text-brand"
              }`}
            >
              <Icon size={17} />
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-stone-200 bg-white px-5">
          <div>
            <span className="text-sm font-semibold">商户工作台</span>
            <span className="ml-3 text-xs text-stone-400">
              {shopName || "未登录"}
            </span>
          </div>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 text-xs text-stone-500 transition hover:text-brand"
          >
            <LogOut size={14} /> 退出登录
          </button>
        </header>
        <main className="flex-1 px-5 py-6 md:px-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
