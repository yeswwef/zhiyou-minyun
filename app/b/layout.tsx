import { PageTransition } from "@/components/motion/PageTransition";

/**
 * B 端商户后台外壳（空壳）
 * 注意：这里是真实的路径段 b，所以页面 URL 是 /b/xxx（不是路由组）。
 * 以后在这层加：商户登录鉴权、左侧菜单（商品/订单/活动/内容/工作室）。
 */
export default function BLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col">
      <header className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3">
        <span className="font-semibold">智游闽韵 · 商户后台</span>
        <span className="text-xs text-stone-400">b/ 路由段</span>
      </header>
      <main className="flex-1 px-4 py-5">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
