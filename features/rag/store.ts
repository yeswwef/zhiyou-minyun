/**
 * @module-note features/rag/store.ts
 * 本地JSON索引读取：按文件状态复用缓存并合并并发加载；不是独立向量数据库客户端。
 */
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { config } from "./config";
import type { Index } from "./types";
import { logged, ragLog } from "./logger";

let cached: { stamp: string; index: Index } | undefined;
let loading: Promise<Index> | undefined;
/**
 * 加载知识索引并记录版本与规模，复用进程缓存。
 */
export async function loadIndex(): Promise<Index> {
  return logged("index.load",{},async()=>{
    const index=await readIndex();
    ragLog("index.summary",{version:index.version,files:new Set(index.parents.map(p=>p.file)).size,chunks:index.chunks.length,dimensions:index.dimensions});
    return index;
  });
}
/**
 * 根据文件状态读取 JSON 索引，合并同时发生的加载请求。
 */
async function readIndex(): Promise<Index> {
  const file = path.join(config().dataDir, "index.json");
  const info = await stat(file);
  const stamp = `${file}:${info.mtimeMs}:${info.size}`;
  if (cached?.stamp === stamp) { ragLog("index.cache",{hit:true}); return cached.index; }
  if (loading) { ragLog("index.cache",{sharedLoad:true}); return loading; }
  ragLog("index.cache",{hit:false});
  loading = (async () => {
    const index: Index = JSON.parse(await readFile(file, "utf8"));
    if (index.schema !== 1 || !Array.isArray(index.chunks) || !Array.isArray(index.parents)) throw new Error("INVALID_INDEX");
    cached = { stamp, index }; return index;
  })();
  try { return await loading; } finally { loading = undefined; }
}
