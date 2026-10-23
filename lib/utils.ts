/**
 * @module-note lib/utils.ts
 * 公共服务层：被页面或接口复用；涉及数据库、会话和基础设施的逻辑应留在服务端。
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** 合并 Tailwind 类名，后写的类覆盖前写的冲突类 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
