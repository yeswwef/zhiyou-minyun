/**
 * @module-note features/rag/ingest.ts
 * 离线入库：TXT结构切块、行号定位、向量复用及生成；通过构建锁和原子替换发布索引快照。
 */
import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, readFile, readdir, rename, unlink, lstat } from "node:fs/promises";
import path from "node:path";
import { config } from "./config";
import { embed } from "./providers";
import type { Chunk, Index, Parent } from "./types";

/**
 * 计算 SHA256 内容摘要，用于判断文档版本与向量复用。
 * 输入：value；类型与可选项见函数签名。
 */
export const hash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");

/**
 * 按标题或FAQ边界切分父块与子块，记录文件、行号及父子关系。
 * 输入：file、raw；类型与可选项见函数签名。
 */
export function parseDocument(file: string, raw: string): { parents: Parent[]; chunks: Chunk[] } {
  const text = raw.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const lines = text.split("\n");
  const digest = hash(raw);
  const faq = /^(07|08|09|10)_/.test(file);
  const starts = lines.flatMap((line, i) => (faq ? /^\d+\. 问：/ : /^##\s|^【FZ-/).test(line) ? [i] : []);
  if (!starts.length) throw new Error(`NO_SEMANTIC_BLOCKS:${file}`);
  const parents: Parent[] = [], chunks: Chunk[] = [];
  for (let n = 0; n < starts.length; n++) {
    const start = starts[n];
    let end = (starts[n + 1] ?? lines.length) - 1;
    // Section headings between FAQ entries belong to neither answer.
    if (faq) { const section = lines.findIndex((line, i) => i > start && i <= end && /^##\s/.test(line)); if (section >= 0) end = section - 1; }
    while (end > start && !lines[end].trim()) end--;
    const title = lines[start].replace(/^##\s*|^\d+\. 问：|^【[^】]+】/g, "").trim();
    const parentId = hash(`${file}:${digest}:${start}`).slice(0, 24);
    const parent: Parent = { id: parentId, file, hash: digest, title, category: file.slice(0, 2),
      text: lines.slice(start, end + 1).join("\n"), lineStart: start + 1, lineEnd: end + 1,
      access: "public", kind: faq ? "guidance" : "topic" };
    parents.push(parent);
    // Keep normal Q&A pairs intact. Oversized parents split by source lines, with exact locators.
    let childStart = start, size = 0;
    for (let i = start; i <= end; i++) {
      size += lines[i].length;
      if (size >= 1000 || i === end) {
        chunks.push({ ...parent, id: hash(`${parentId}:${childStart}:${i}`).slice(0, 24), parentId,
          text: lines.slice(childStart, i + 1).join("\n"), lineStart: childStart + 1, lineEnd: i + 1 });
        childStart = i + 1; size = 0;
      }
    }
  }
  return { parents, chunks };
}

/**
 * 扫描受支持的 TXT，构建词法或向量索引并原子替换快照；失败保留旧文件。
 * 输入：withVectors；类型与可选项见函数签名。
 */
export async function buildIndex(withVectors = false): Promise<Index> {
  const c = config();
  await mkdir(c.dataDir, { recursive: true });
  const lockPath = path.join(c.dataDir, "ingest.lock");
  const lock = await open(lockPath, "wx"); // one writer; an abandoned lock requires explicit operator review
  const temp = path.join(c.dataDir, `index-${randomUUID()}.tmp`);
  try {
    const files = (await readdir(c.sourceDir)).filter((f) => /^(0[1-9]|10)_.+\.txt$/i.test(f)).sort();
    if (!files.length) throw new Error("NO_KNOWLEDGE_FILES");
    const parents: Parent[] = [], chunks: Chunk[] = [];
    for (const file of files) {
      const target = path.join(c.sourceDir, file);
      const stat = await lstat(target);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 2_000_000) throw new Error("INVALID_SOURCE_FILE");
      const raw = new TextDecoder("utf-8", { fatal: true }).decode(await readFile(target));
      const parsed = parseDocument(file, raw);
      parents.push(...parsed.parents); chunks.push(...parsed.chunks);
    }
    let old: Index | undefined;
    try { old = JSON.parse(await readFile(path.join(c.dataDir, "index.json"), "utf8")); } catch { /* fresh build */ }
    const identity = `${c.base}|${c.embedding}|${c.dimensions}`;
    const reuse = new Map(old?.embedding === identity ? old.chunks.map((chunk) => [chunk.id, chunk.vector]) : []);
    if (withVectors) {
      for (const chunk of chunks) chunk.vector = reuse.get(chunk.id);
      const pending = chunks.filter((chunk) => !chunk.vector);
      for (let i = 0; i < pending.length; i += 10) {
        const batch = pending.slice(i, i + 10);
        const vectors = await embed(batch.map((chunk) => `${chunk.title}\n${chunk.text}`));
        batch.forEach((chunk, j) => { chunk.vector = vectors[j]; });
      }
    }
    const index: Index = { schema: 1, version: hash(chunks.map((chunk) => chunk.id).join("|") + (withVectors ? identity : "lexical")),
      builtAt: new Date().toISOString(), embedding: withVectors ? identity : null,
      dimensions: withVectors ? c.dimensions : 0, parents, chunks };
    const handle = await open(temp, "wx");
    try { await handle.writeFile(JSON.stringify(index)); await handle.sync(); } finally { await handle.close(); }
    await rename(temp, path.join(c.dataDir, "index.json")); // publish only a complete snapshot, including removals
    return index;
  } finally {
    await unlink(temp).catch(() => {});
    await lock.close(); await unlink(lockPath);
  }
}
