//引入页面过渡动画组件
import { PageTransition } from "@/components/motion/PageTransition";

/**
 * C 端外壳：全宽、无约束，各页面自管头部与内容。
 */
export default function CLayout({ children }: { children: React.ReactNode }) {
  return (
    //min-h-screen：最小高度占满屏幕
    //w-full：宽度占满屏幕
    <div className="min-h-screen w-full">
      <PageTransition>{children}</PageTransition>
    </div>
  );
}
