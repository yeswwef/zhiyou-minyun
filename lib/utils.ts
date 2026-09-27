import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** 合并 Tailwind 类名，后写的类覆盖前写的冲突类 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
