/**
 * @module-note features/rag/retrieve.ts
 * 混合检索：访问与分类过滤后执行BM25、余弦相似度、RRF融合、模型重排和去重。
 */
import { config } from "./config";
import { embed, modelReady, rerank } from "./providers";
import type { Chunk, Hit, Index } from "./types";
import { ragLog } from "./logger";

/**
 * 对英文提取词项，对中文构建相邻二字词项，供关键词检索使用。
 * 输入：text；类型与可选项见函数签名。
 */
export function tokenize(text: string): string[] {
  const segments = text.toLowerCase().match(/[a-z0-9]+|[\u3400-\u9fff]+/g) ?? [];
  return segments.flatMap((s) => /^[a-z0-9]/.test(s) ? [s] : s.length === 1 ? [s] : Array.from({ length: s.length - 1 }, (_, i) => s.slice(i, i + 2)));
}
/**
 * 计算两个向量的余弦相似度，并防御维度不匹配或零范数。
 * 输入：a、b；类型与可选项见函数签名。
 */
export function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length || !a.length) return 0;
  const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
  const norm = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0) * b.reduce((sum, v) => sum + v * v, 0));
  return norm ? dot / norm : 0;
}
/**
 * 根据词频、逆文档频率和长度归一计算片段关键词相关度。
 * 输入：query、chunks；类型与可选项见函数签名。
 */
export function bm25(query: string, chunks: Chunk[]): number[] {
  const docs = chunks.map((c) => tokenize(`${c.title}\n${c.text}`));
  const terms = [...new Set(tokenize(query))];
  const average = docs.reduce((sum, d) => sum + d.length, 0) / (docs.length || 1) || 1;
  const df = new Map(terms.map((t) => [t, docs.filter((d) => d.includes(t)).length]));
  return docs.map((tokens) => terms.reduce((sum, term) => {
    const freq = tokens.filter((t) => t === term).length;
    const idf = Math.log(1 + (docs.length - df.get(term)! + 0.5) / (df.get(term)! + 0.5));
    return sum + idf * freq * 2.2 / (freq + 1.2 * (0.25 + 0.75 * tokens.length / average));
  }, 0));
}
/**
 * 使用 RRF 融合多路候选名次，按片段ID合并重复命中。
 * 输入：lists；类型与可选项见函数签名。
 */
export function fuse(lists: Hit[][]): Hit[] {
  const merged = new Map<string, Hit>();
  for (const list of lists) list.forEach((hit, i) => {
    const previous = merged.get(hit.chunk.id);
    merged.set(hit.chunk.id, { ...hit, score: (previous?.score ?? 0) + 1 / (60 + i + 1),
      lexical: Math.max(previous?.lexical ?? 0, hit.lexical), dense: Math.max(previous?.dense ?? 0, hit.dense) });
  });
  return [...merged.values()].sort((a, b) => b.score - a.score);
}
/**
 * 先做访问与分类过滤，再执行 BM25 和向量检索、RRF、重排及去重，返回候选与降级原因。
 * 输入：index、queries、category、stage；类型与可选项见函数签名。
 */
export async function retrieve(index: Index, queries: string[], category?: string, stage?: (text: string) => void) {
  stage?.("正在检索");
  const start=Date.now();
  ragLog("retrieval.start",{queries:queries.length,category:category||"all"});
  ragLog("retrieval.query",{queries},"DEBUG");
  // ACL and metadata filtering happen BEFORE both retrieval branches, not after generation.
  const chunks = index.chunks.filter((c) => c.access === "public" && (!category || c.category === category));
  const warnings: string[] = [];
  const c = config();
  let vectors: number[][] = [];
  if (modelReady() && index.embedding === `${c.base}|${c.embedding}|${c.dimensions}`) {
    try { vectors = await embed(queries); } catch { warnings.push("向量查询失败，已降级为关键词检索"); }
  } else warnings.push("当前使用 BM25；未启用匹配版本的语义向量索引");
  const lists: Hit[][] = [];
  queries.forEach((query, n) => {
    const lexical = bm25(query, chunks);
    const hits = chunks.map((chunk, i) => ({ chunk, score: 0, lexical: lexical[i], dense: vectors[n] && chunk.vector ? cosine(vectors[n], chunk.vector!) : 0 }));
    lists.push(hits.filter((h) => h.lexical > 0).sort((a, b) => b.lexical - a.lexical).slice(0, 12));
    if (vectors[n]) lists.push(hits.filter((h) => h.dense > 0.35).sort((a, b) => b.dense - a.dense).slice(0, 12));
  });
  let hits = fuse(lists).slice(0, 18);
  ragLog("bm25.complete",{count:lists.filter((_,i)=>!vectors.length||i%2===0).reduce((n,l)=>n+l.length,0)});
  ragLog("dense.complete",{enabled:!!vectors.length,count:vectors.length?lists.filter((_,i)=>i%2===1).reduce((n,l)=>n+l.length,0):0});
  ragLog("rrf.complete",{count:hits.length});
  ragLog("retrieval.candidates",{candidates:hits.map(h=>({id:h.chunk.id,title:h.chunk.title,lexical:h.lexical,dense:h.dense,score:h.score}))},"DEBUG");
  if (hits.length && modelReady() && c.rerankUrl) {
    stage?.("正在重排");
    try {
      const scores = await rerank(queries[0], hits.map((h) => h.chunk.text));
      hits = scores.map((r) => ({ ...hits[r.index], rerank: r.score })).sort((a, b) => b.rerank - a.rerank);
    } catch { warnings.push("重排服务失败，保留 RRF 排序"); }
  } else warnings.push("未配置 Cross-Encoder 重排服务，当前使用 RRF 排序");
  const seen = new Set<string>();
  const before=hits.length;
  hits = hits.filter((h) => { const key = h.chunk.text.replace(/\s/g, ""); if (seen.has(key)) return false; seen.add(key); return true; });
  ragLog("context.deduplicate",{before,after:hits.length,selected:Math.min(hits.length,8)});
  ragLog("rerank.result",{applied:hits.some(h=>h.rerank!==undefined),ranking:hits.map(h=>({id:h.chunk.id,score:h.rerank}))},"DEBUG");
  for(const reason of warnings) ragLog("retrieval.fallback",{reason},"WARN");
  ragLog("retrieval.complete",{durationMs:Date.now()-start,count:Math.min(hits.length,8),reranked:hits.some(h=>h.rerank!==undefined)});
  return { hits: hits.slice(0, 8), warnings };
}
