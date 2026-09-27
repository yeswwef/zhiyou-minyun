import Link from "next/link";

/**
 * C 端首页占位（空壳）
 * 页面骨架留在这里，业务内容等你确认后一块一块加。
 * 文件名带 (c) 是 Next.js 的「路由组」：括号目录不出现在 URL 里，
 * 所以这个页面以后要走 /home，可以在 (c)/layout.tsx 里放 C 端专用的底部导航。
 */
export default function CHomePlaceholder() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">C 端首页（占位）</h1>
      <p className="text-sm text-stone-600">
        这里以后放：AI 文化问答入口、行程规划入口、资源中心列表、预警提示。
      </p>
      <div className="card text-xs text-stone-500">
        当前是空壳状态，页面只有结构和样式，没有业务逻辑。
      </div>
      <Link href="/" className="inline-block text-xs text-red-700">
        ← 返回入口页
      </Link>
    </div>
  );
}
