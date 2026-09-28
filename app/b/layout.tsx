import Link from "next/link";
import { BarChart3, Box, ClipboardList, LayoutDashboard, Megaphone, Settings } from "lucide-react";
import { PageTransition } from "@/components/motion/PageTransition";

/**
 * B 端商户后台外壳（空壳）
 * 注意：这里是真实的路径段 b，所以页面 URL 是 /b/xxx（不是路由组）。
 * 以后在这层加：商户登录鉴权、左侧菜单（商品/订单/活动/内容/工作室）。
 */
export default function BLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-[#f6f7f5] text-ink">
      <aside className="hidden w-60 shrink-0 border-r border-stone-200 bg-white p-5 md:block">
        <Link href="/b/dashboard" className="mb-9 block font-serif text-lg font-bold">智游闽韵 <span className="text-xs font-sans font-normal text-stone-400">商户端</span></Link>
        <nav className="space-y-1 text-sm">
          {[["/b/dashboard", "经营看板", LayoutDashboard], ["#products", "商品管理", Box], ["#orders", "订单核销", ClipboardList], ["#content", "内容与活动", Megaphone], ["#analytics", "数据分析", BarChart3]].map(([href, label, Icon]) => <Link href={href as string} key={label as string} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-stone-600 hover:bg-stone-100 hover:text-brand"><Icon size={17} />{label as string}</Link>)}
        </nav>
        <Link href="#settings" className="mt-8 flex items-center gap-3 px-3 py-2.5 text-sm text-stone-500"><Settings size={17} />账户设置</Link>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-stone-200 bg-white px-5"><div><span className="text-sm font-semibold">商户工作台</span><span className="ml-3 text-xs text-stone-400">福州三坊七巷文创店</span></div><Link href="/home" className="text-xs text-stone-500 hover:text-brand">返回 C 端</Link></header>
        <main className="flex-1 px-5 py-6 md:px-8">
        <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
