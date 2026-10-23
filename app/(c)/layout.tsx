/**
 * @module-note app/(c)/layout.tsx
 * 游客端布局。服务端路由入口负责组装页面或跳转，复杂交互委托给客户端组件。
 */
//引入页面过渡动画组件
import { PageTransition } from "@/components/motion/PageTransition";
import { LegacyFavoritesMigration } from "@/components/LegacyFavoritesMigration";

/**
 * C 端外壳：全宽、无约束，各页面自管头部与内容。
 */
export default function CLayout({ children }: { children: React.ReactNode }) {
  return (
    //min-h-screen：最小高度占满屏幕
    //w-full：宽度占满屏幕
    <div className="min-h-screen w-full">
      <LegacyFavoritesMigration />
      <PageTransition>{children}</PageTransition>
    </div>
  );
}
