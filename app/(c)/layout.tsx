import { PageTransition } from "@/components/motion/PageTransition";

/**
 * C 端外壳：全宽、无约束，各页面自管头部与内容。
 */
export default function CLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full">
      <PageTransition>{children}</PageTransition>
    </div>
  );
}
