import { PageTransition } from "@/components/motion/PageTransition";

/**
 * C 端外壳（空壳）
 * 以后 C 端的公共元素放这里：顶部标题栏、底部五宫格导航（首页/问答/行程/资源/我的）。
 */
export default function CLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-white/90 px-4 py-3 backdrop-blur">
        <span className="font-semibold">智游闽韵 · C 端</span>
        <span className="text-xs text-stone-400">空壳</span>
      </header>
      <main className="flex-1 px-4 py-4">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
