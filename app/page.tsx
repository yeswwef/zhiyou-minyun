import Link from "next/link";
import { FadeIn } from "@/components/motion/FadeIn";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";

/** 入口页：品牌落地页 */
export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-paper">
      {/* 顶部品牌渐变 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-brand-soft via-brand-soft/40 to-transparent" />
      <div className="pointer-events-none absolute right-[-6rem] top-24 h-48 w-48 rounded-full bg-sea/10 blur-2xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center gap-9 px-5 py-12">
        <FadeIn>
          <header className="text-center">
            <p className="text-xs font-semibold tracking-[0.35em] text-brand">FUJIAN · CULTURE & TRAVEL</p>
            <h1 className="mt-3 font-serif text-5xl font-bold tracking-tight text-ink">智游闽韵</h1>
            <div className="mx-auto mt-4 h-px w-16 bg-gold" />
            <p className="mt-4 text-sm text-sea">AI Native 福建文旅智能平台</p>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-stone-600">
              AI 文化问答 · 智能行程规划 · 多模态识景 · 文旅资源中心，框架已就位。
            </p>
          </header>
        </FadeIn>

        <Stagger className="grid gap-4">
          <StaggerItem>
            <Link
              href="/home"
              className="flex items-center justify-between rounded-2xl border border-stone-200 bg-surface p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-brand hover:shadow-lg"
            >
              <span>
                <span className="block font-serif text-lg font-bold text-ink">C 端 · 游客</span>
                <span className="mt-1 block text-xs text-stone-500">AI 问答 · 行程 · 识景 · 资源中心</span>
              </span>
              <span className="text-sm font-semibold text-brand">/home →</span>
            </Link>
          </StaggerItem>
          <StaggerItem>
            <Link href="/admin/dashboard" className="flex items-center justify-between rounded-2xl border border-stone-200 bg-surface p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-brand hover:shadow-lg">
              <span><span className="block font-serif text-lg font-bold text-ink">后台管理 · 平台运营</span><span className="mt-1 block text-xs text-stone-500">用户 · 商户 · 内容审核 · 数据总览</span></span><span className="text-sm font-semibold text-brand">/admin/dashboard →</span>
            </Link>
          </StaggerItem>
          <StaggerItem>
            <Link
              href="/b/dashboard"
              className="flex items-center justify-between rounded-2xl border border-stone-200 bg-surface p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-brand hover:shadow-lg"
            >
              <span>
                <span className="block font-serif text-lg font-bold text-ink">B 端 · 商户后台</span>
                <span className="mt-1 block text-xs text-stone-500">商品上架 · 订单核销 · AI 内容生产</span>
              </span>
              <span className="text-sm font-semibold text-brand">/b/dashboard →</span>
            </Link>
          </StaggerItem>
        </Stagger>

        <FadeIn delay={0.15}>
          <footer className="text-center text-xs text-stone-400">
            健康检查 <code className="rounded bg-stone-100 px-1.5 py-0.5 text-stone-600">/api/health</code>
          </footer>
        </FadeIn>
      </div>
    </main>
  );
}
