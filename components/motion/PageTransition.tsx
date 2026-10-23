/**
 * @module-note components/motion/PageTransition.tsx
 * 共享界面组件：接收页面数据或处理局部交互，避免每个页面重复实现。
 */
"use client";

import { motion } from "framer-motion";

/** 页面进入动效：淡入 + 上滑 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
