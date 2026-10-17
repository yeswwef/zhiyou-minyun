/**
 * @module-note features/rag/limits.ts
 * 单进程问答限流和并发门控；成功获取额度后需在finally释放，不提供跨实例分布式保证。
 */
// Single-process development protection. Use shared Redis limits before multi-instance deployment.
let active = 0;
const windows = new Map<string, { time: number; count: number }>();
/**
 * 申请单进程并发和频率额度；成功返回幂等释放函数，超限返回 null。
 * 输入：key；类型与可选项见函数签名。
 */
export function acquire(key: string): (() => void) | null {
  const now = Date.now();
  for (const [id, slot] of windows) if (now - slot.time >= 60000) windows.delete(id);
  const slot = windows.get(key) ?? { time: now, count: 0 };
  if (active >= 4 || slot.count >= 12 || (!windows.has(key) && windows.size >= 1000)) return null;
  slot.count++; windows.set(key, slot); active++;
  let released = false;
  return () => { if (!released) { released = true; active--; } };
}
