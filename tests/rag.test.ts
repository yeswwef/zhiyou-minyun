/**
 * @module-note tests/rag.test.ts
 * 自动化验证：断言覆盖预期行为，模拟测试不代表真实模型或生产环境验收通过。
 */
import assert from "node:assert/strict";
import { test, after } from "node:test";
import { readFile, readdir, mkdtemp, writeFile, rm, mkdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { parseDocument, buildIndex, hash } from "../features/rag/ingest";
import { bm25, cosine, fuse, retrieve } from "../features/rag/retrieve";
import { answerQuestion, routeQuestion, validateClaims, citation, expandParents } from "../features/rag/pipeline";
import { chat, embed, rerank } from "../features/rag/providers";
import { acquire } from "../features/rag/limits";
import { readBody } from "../features/rag/http";
import type { Hit, Index } from "../features/rag/types";
import { normalizeHistory, resolveReference } from "../features/rag/context";
import { answerParagraph, formatAnswerText } from "../features/ai-chat/presentation";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AnswerContent } from "../features/ai-chat/AnswerContent";
import { readSse } from "../features/rag/stream";
import { liveCases } from "./rag-live-cases";
import { withRagLog, ragLog } from "../features/rag/logger";
import { cleanFollowUps, generateFollowUps } from "../features/rag/followups";
import { retrievalSummary } from "../features/ai-chat/presentation";
import type { RagAnswer } from "../features/rag/types";

test("follow-ups reject duplicates, original question and malformed suggestions", () => {
  assert.deepEqual(cleanFollowUps(["三坊七巷？", " 推荐美食？ ", "推荐美食?", null, "x".repeat(161), "<script>", "路线怎么安排？", "交通？", "第四个？"], "三坊七巷"), ["推荐美食？", "路线怎么安排？", "交通？"]);
  assert.deepEqual(cleanFollowUps({ questions: [] }, "问题"), []);
});

test("reference overview deduplicates files and uses actual queries", () => {
  const answer = { sources: [{ file: "a.txt" }, { file: "a.txt" }, { file: "b.txt" }], trace: { queries: ["三坊七巷", "三坊七巷"], retrieval: {} } } as RagAnswer;
  assert.deepEqual(retrievalSummary(answer), { documents: 2, queries: ["三坊七巷"], searched: true });
  delete answer.trace.retrieval;
  assert.deepEqual(retrievalSummary(answer).queries, []);
});

test("follow-up model failure preserves the answer and returns no invented suggestions", async () => {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.RAG_API_KEY;
  const previousBase = process.env.RAG_MODEL_BASE_URL;
  process.env.RAG_API_KEY = "test-only";
  process.env.RAG_MODEL_BASE_URL = "https://test.invalid/v1";
  globalThis.fetch = async () => { throw new Error("TEST_FAILURE"); };
  const answer = { mode: "rag", sections: [{ text: "已完成的回答" }] } as RagAnswer;
  try {
    assert.deepEqual(await generateFollowUps("介绍三坊七巷", answer, "zh"), []);
    assert.equal(answer.sections[0].text, "已完成的回答");
    globalThis.fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: '["三坊七巷有哪些美食？","三坊七巷如何安排半日游？","三坊七巷有哪些古建筑？"]' } }] }), { status: 200 });
    assert.equal((await generateFollowUps("介绍三坊七巷", answer, "zh")).length, 3);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.RAG_API_KEY; else process.env.RAG_API_KEY = previousKey;
    if (previousBase === undefined) delete process.env.RAG_MODEL_BASE_URL; else process.env.RAG_MODEL_BASE_URL = previousBase;
  }
});

// Tests never load .env and never call real model services.
const originalEnv = { ...process.env };
test("answer content renders bold headings and separate safe list items", () => {
  const html = renderToStaticMarkup(React.createElement(AnswerContent, { text: "**三坊七巷**\n\n古街介绍。\n- 看点：**南后街**\n- 建议慢游。\n\n### 提醒\n<script>alert(1)</script>" }));
  assert.match(html, /<h3>三坊七巷<\/h3>/);
  assert.match(html, /<strong>南后街<\/strong>/);
  assert.equal((html.match(/<li>/g) ?? []).length, 2);
  assert.match(html, /<h3>提醒<\/h3>/);
  assert.ok(!html.includes("<script>"));
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotThrow(() => renderToStaticMarkup(React.createElement(AnswerContent, { text: "**三坊" })));
});
test("answer formatting preserves logical paragraphs and decimal durations", () => {
  assert.equal(formatAnswerText("先游古街。\r\n\r\n再去公园。"), "先游古街。\n\n再去公园。");
  assert.equal(formatAnswerText("路线： 1. **三坊七巷**：2.5–3小时； 2. **上下杭**：1.5小时。"), "路线：\n\n1. **三坊七巷**：2.5–3小时；\n\n2. **上下杭**：1.5小时。");
  assert.equal(formatAnswerText("票价 12.50 元，版本 1.2。"), "票价 12.50 元，版本 1.2。");
});
const originalFetch = globalThis.fetch;
process.env.RAG_API_KEY = "";
process.env.DASHSCOPE_API_KEY = "";
after(() => { process.env = originalEnv; globalThis.fetch = originalFetch; });
const sample = "# 词典\r\n\r\n## 第一类\r\n\r\n1. 问：三山两塔指什么？\r\n答：三山指于山、乌山、屏山，两塔指白塔和乌塔。\r\n\r\n## 第二类\r\n\r\n2. 问：预约是什么？\r\n答：预约是按指定日期与时间安排参观名额。\r\n";
const parsed = parseDocument("07_词典.txt", sample);
const index: Index = { schema: 1, version: "test", builtAt: "2026-10-13", embedding: null, dimensions: 0, ...parsed };
const hit: Hit = { chunk: parsed.chunks[0], score: 1, lexical: 10, dense: 0 };

test("FAQ semantic split preserves whole questions, answers and exact CRLF line locations", () => {
  assert.equal(parsed.parents.length, 2);
  assert.equal(parsed.chunks[0].lineStart, 5);
  assert.equal(parsed.chunks[0].lineEnd, 6);
  assert.ok(!parsed.chunks[0].text.includes("第二类"));
  for (const chunk of parsed.chunks) assert.equal(sample.replace(/\r\n/g, "\n").split("\n").slice(chunk.lineStart - 1, chunk.lineEnd).join("\n"), chunk.text);
});
test("topic headings produce semantic blocks", () => {
  const blocks = parseDocument("01_街区.txt", "标题\n注意：以公告为准\n## 三坊七巷\n街区内容\n## 上下杭\n历史内容");
  assert.equal(blocks.chunks.length, 2); assert.equal(blocks.chunks[1].title, "上下杭");
});
test("file content changes invalidate hashes and IDs", () => {
  const changed = parseDocument("07_词典.txt", sample + "更新");
  assert.notEqual(parsed.chunks[0].id, changed.chunks[0].id);
  assert.equal(parsed.chunks[0].hash, hash(sample));
});
test("BM25 ranks matching Chinese text above unrelated text and returns zero for no match", () => {
  const scores = bm25("三山两塔", parsed.chunks);
  assert.ok(scores[0] > scores[1]); assert.deepEqual(bm25("xyzabc", parsed.chunks), [0, 0]);
});
test("cosine validates dimensions and zero norms", () => {
  assert.equal(cosine([1, 0], [1, 0]), 1); assert.equal(cosine([0, 0], [1, 0]), 0); assert.equal(cosine([1], [1, 0]), 0);
});
test("RRF deduplicates shared hits and adds reciprocal ranks", () => {
  const results = fuse([[hit], [hit]]); assert.equal(results.length, 1); assert.equal(results[0].score, 2 / 61);
});
test("metadata and public ACL filter before retrieval", async () => {
  assert.equal((await retrieve(index, ["三山两塔"], "02")).hits.length, 0);
  const privateIndex = { ...index, chunks: index.chunks.map((c) => ({ ...c, access: "private" as "public" })) };
  assert.equal((await retrieve(privateIndex, ["三山两塔"])).hits.length, 0);
});
test("parent expansion preserves qualifications and deduplicates siblings", () => {
  const context = expandParents([hit, hit], index);
  assert.equal(context.length, 1); assert.equal(context[0].chunk.id, parsed.parents[0].id);
});
test("citation points to exact quote line and rejects absent text", () => {
  const cite = citation(hit, "1", "答：三山指于山、乌山、屏山，两塔指白塔和乌塔。");
  assert.equal(cite.lineStart, 6); assert.equal(cite.lineEnd, 6);
  assert.throws(() => citation(hit, "1", "不存在的引文"));
});
test("claim validation rejects fabricated citation IDs, quotes and unsupported numbers", () => {
  const base = { text: "三山指于山、乌山、屏山。", source: hit.chunk.id, quote: "三山指于山、乌山、屏山", kind: "fact" };
  assert.equal(validateClaims({ insufficient: false, claims: [base] }, [hit]).claims.length, 1);
  for (const change of [{ source: "fake" }, { quote: "不存在的引文片段" }, { text: "门票价格为100元" }, { kind: "unknown" }]) {
    assert.throws(() => validateClaims({ insufficient: false, claims: [{ ...base, ...change }] }, [hit]));
  }
});
test("routing keeps factual questions grounded and live questions outside static KB", () => {
  assert.equal(routeQuestion("你好"), "general"); assert.equal(routeQuestion("今天还有票吗"), "live");
  assert.equal(routeQuestion("预约是什么意思"), "knowledge"); assert.equal(routeQuestion("三山两塔指什么"), "knowledge");
});
test("offline pipeline returns genuine local excerpt, not generated answer", async () => {
  const result = await answerQuestion("三山两塔指什么？", [], "zh", undefined, index);
  assert.equal(result.mode, "extractive"); assert.equal(result.sources.length, 1); assert.ok(sample.includes(result.sources[0].quote.replace(/\n/g, "\r\n")));
});
test("offline pipeline refuses live, unrelated, follow-up and multipart questions", async () => {
  for (const question of ["今天还有票吗", "quantum gravity xyz", "那里呢", "三山两塔是什么？预约是什么？"]) {
    const result = await answerQuestion(question, [], "zh", undefined, index);
    assert.equal(result.mode, "refused", question); assert.equal(result.sources.length, 0);
  }
});
test("single-process limits cap concurrency and release idempotently", () => {
  const releases = [0, 1, 2, 3].map((n) => acquire(`test-${n}`)!);
  assert.equal(acquire("test-overflow"), null);
  releases.forEach((r) => { r(); r(); });
  const release = acquire("test-restored"); assert.ok(release); release();
});

test("real TXT corpus includes workbook imports; every excerpt has a correct source locator", async () => {
  const root = path.resolve("../fuzhou_rag");
  const files = (await readdir(root)).filter((f) => /^(0[1-9]|10)_.+\.txt$/.test(f));
  assert.equal(files.length, 6); let total = 0;
  for (const file of files) {
    const raw = await readFile(path.join(root, file), "utf8");
    const doc = parseDocument(file, raw); total += doc.parents.length;
    if (/^(07|08|09|10)_/.test(file)) assert.equal(doc.parents.length, 60);
    if (file === "01_问答知识库.txt") assert.equal(doc.parents.length, 50);
    if (file === "02_研学.txt") assert.equal(doc.parents.length, 4);
    const lines = raw.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n");
    for (const c of doc.chunks) assert.equal(lines.slice(c.lineStart - 1, c.lineEnd).join("\n"), c.text);
  }
  assert.equal(total, 294);
});
test("atomic rebuild reflects removals and preserves previous index on invalid input", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "zhiyou-rag-test-"));
  const savedSource = process.env.RAG_SOURCE_DIR, savedData = process.env.RAG_DATA_DIR;
  process.env.RAG_SOURCE_DIR = path.join(dir, "source"); process.env.RAG_DATA_DIR = path.join(dir, "store");
  try {
    await mkdir(process.env.RAG_SOURCE_DIR);
    const first = path.join(process.env.RAG_SOURCE_DIR, "07_测试.txt"), second = path.join(process.env.RAG_SOURCE_DIR, "08_测试.txt");
    await writeFile(first, sample); await writeFile(second, sample);
    assert.equal((await buildIndex()).chunks.length, 4);
    await rm(second); const next = await buildIndex(); assert.equal(next.chunks.length, 2);
    const snapshot = await readFile(path.join(process.env.RAG_DATA_DIR, "index.json"), "utf8");
    await writeFile(first, "invalid input without headings");
    await assert.rejects(() => buildIndex());
    assert.equal(await readFile(path.join(process.env.RAG_DATA_DIR, "index.json"), "utf8"), snapshot);
  } finally {
    if (savedSource === undefined) delete process.env.RAG_SOURCE_DIR; else process.env.RAG_SOURCE_DIR = savedSource;
    if (savedData === undefined) delete process.env.RAG_DATA_DIR; else process.env.RAG_DATA_DIR = savedData;
    // Only this test-created, resolved temporary directory is removed.
    assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir()) + path.sep));
    await rm(dir, { recursive: true });
  }
});

/**
 * 模拟模型服务响应，隔离真实网络与付费API。
 * 输入：responses；类型与可选项见函数签名。
 */
function fakeProvider(responses: unknown[]) {
  process.env.RAG_API_KEY = "test-key-not-a-real-secret"; process.env.RAG_MODEL_BASE_URL = "https://model.invalid/v1";
  let calls = 0;
  globalThis.fetch = async () => { const value = responses[calls++]; if (value === undefined) throw new Error("UNEXPECTED_MODEL_CALL"); return new Response(JSON.stringify(value), { status: 200 }); };
  return { count: () => calls, restore: () => { globalThis.fetch = originalFetch; delete process.env.RAG_MODEL_BASE_URL; process.env.RAG_API_KEY = ""; } };
}
/**
 * 构造测试所需的模型接口返回值。
 * 输入：value；类型与可选项见函数签名。
 */
const modelResponse = (value: unknown) => ({ choices: [{ message: { content: JSON.stringify(value) } }] });

test("SSE handles byte-split Chinese and CRLF frames and rejects truncation", async () => {
  const bytes = new TextEncoder().encode(': heartbeat\r\n\r\ndata: {"text":"福州"}\r\n\r\ndata: [DONE]\n\n');
  const frames: string[] = [];
  await readSse(new ReadableStream({ /**
 * 初始化流控制器并开始产生数据事件。
 * 输入：c；类型与可选项见函数签名。
 */
start(c) { for (const b of bytes) c.enqueue(new Uint8Array([b])); c.close(); } }), text => frames.push(text));
  assert.deepEqual(frames, ['{"text":"福州"}', '[DONE]']);
  await assert.rejects(() => readSse(new ReadableStream({ /**
 * 初始化流控制器并开始产生数据事件。
 * 输入：c；类型与可选项见函数签名。
 */
start(c) { c.enqueue(new TextEncoder().encode('data: unfinished')); c.close(); } }), () => {}));
});

test("provider streams deltas before completion and requires DONE", async () => {
  const provider = fakeProvider([]);
  globalThis.fetch = async () => new Response('data: {"choices":[{"delta":{"content":"福"}}]}\n\ndata: {"choices":[{"delta":{"content":"州"}}]}\n\ndata: [DONE]\n\n');
  try {
    const parts: string[] = [];
    assert.equal(await chat("test", [], text => parts.push(text)), "福州");
    assert.deepEqual(parts, ["福", "州"]);
    globalThis.fetch = async () => new Response('data: {"choices":[{"delta":{"content":"不完整"}}]}\n\n');
    await assert.rejects(() => chat("test", [], () => {}));
  } finally { provider.restore(); }
});
test("HTTP body limit counts UTF-8 bytes and rejects oversized bodies", async () => {
  assert.equal(await readBody(new Request("http://localhost", { method: "POST", body: "中文" }), 6), "中文");
  await assert.rejects(() => readBody(new Request("http://localhost", { method: "POST", body: "中文" }), 5));
});
test("mocked model outage is not reported as missing knowledge", async () => {
  const provider = fakeProvider([]);
  try { const result = await answerQuestion("三山两塔指什么？", [], "zh", undefined, index); assert.equal(result.mode, "refused"); assert.ok(result.intro.includes("不是知识库未导入")); }
  finally { provider.restore(); }
});
test("mocked vectors activate hybrid retrieval with matching model identity", async () => {
  const oldDim = process.env.EMBEDDING_DIM, oldModel = process.env.EMBEDDING_MODEL, oldUrl = process.env.RAG_RERANK_URL;
  process.env.EMBEDDING_DIM = "2"; process.env.EMBEDDING_MODEL = "test-embedding"; process.env.RAG_RERANK_URL = "";
  const provider = fakeProvider([{ data: [{ index: 0, embedding: [1, 0] }] }]);
  try {
    const vectors: Index = { ...index, embedding: "https://model.invalid/v1|test-embedding|2", dimensions: 2,
      chunks: index.chunks.map((c, i) => ({ ...c, vector: i === 0 ? [1, 0] : [0, 1] })) };
    const result = await retrieve(vectors, ["三山两塔"]);
    assert.equal(result.hits[0].dense, 1); assert.equal(provider.count(), 1);
  } finally {
    provider.restore();
    for (const [name, value] of [["EMBEDDING_DIM", oldDim], ["EMBEDDING_MODEL", oldModel], ["RAG_RERANK_URL", oldUrl]]) { if (value === undefined) delete process.env[name!]; else process.env[name!] = value; }
  }
});
test("mocked Cross-Encoder adapter reorders candidates", async () => {
  const oldUrl = process.env.RAG_RERANK_URL;
  process.env.RAG_RERANK_URL = "https://model.invalid/rerank";
  const provider = fakeProvider([{ output: { results: [{ index: 1, relevance_score: 0.95 }, { index: 0, relevance_score: 0.1 }] } }]);
  try {
    const result = await retrieve(index, ["三山两塔预约"]);
    assert.equal(result.hits[0].rerank, 0.95); assert.equal(result.hits[1].rerank, 0.1);
  } finally { provider.restore(); if (oldUrl === undefined) delete process.env.RAG_RERANK_URL; else process.env.RAG_RERANK_URL = oldUrl; }
});
test("mocked LLM pipeline plans, audits, generates and verifies grounded claims", async () => {
  const provider = fakeProvider([
    modelResponse({ status: "full", supportedTopics: ["三山两塔指什么"], missing: [], conflict: false }),
    modelResponse({ insufficient: false, claims: [{ text: "三山指于山、乌山、屏山。", source: parsed.parents[0].id, quote: "三山指于山、乌山、屏山", kind: "fact" }] }),
    modelResponse({ supported: true, complete: true, conflict: false }),
  ]);
  try { const result = await answerQuestion("三山两塔指什么？", [], "zh", undefined, index); assert.equal(result.mode, "rag"); assert.equal(provider.count(), 3); }
  finally { provider.restore(); }
});
test("mocked evidence conflict fails closed before generation", async () => {
  const provider = fakeProvider([modelResponse({ status: "none", supportedTopics: [], missing: [], conflict: true })]);
  try { assert.equal((await answerQuestion("三山两塔指什么？", [], "zh", undefined, index)).mode, "refused"); assert.equal(provider.count(), 1); }
  finally { provider.restore(); }
});
test("mixed requests answer supported facts and explicitly bound missing live data", async () => {
  const provider = fakeProvider([
    modelResponse({ status: "partial", supportedTopics: ["三山两塔"], missing: ["今日余票需查询实时票务系统"], conflict: false }),
    modelResponse({ insufficient: false, claims: [{ text: "三山指于山、乌山、屏山。", source: parsed.parents[0].id, quote: "三山指于山、乌山、屏山", kind: "fact" }] }),
    modelResponse({ supported: true, complete: true, conflict: false })]);
  try { const result = await answerQuestion("三山两塔是什么，并告诉我今天剩几张票", [], "zh", undefined, index); assert.equal(result.mode, "rag"); assert.ok(result.sections.at(-1)!.text.includes("余票")); }
  finally { provider.restore(); }
});
test("invalid quotes receive one repair and must pass verification", async () => {
  const valid = { insufficient: false, claims: [{ text: "三山指于山、乌山、屏山。", source: parsed.parents[0].id, quote: "三山指于山、乌山、屏山", kind: "fact" }] };
  const provider = fakeProvider([
    modelResponse({ status: "full", supportedTopics: ["三山两塔"], missing: [], conflict: false }),
    modelResponse({ ...valid, claims: [{ ...valid.claims[0], quote: "资料里没有这句话" }] }),
    modelResponse(valid), modelResponse({ supported: true, complete: true, conflict: false }),
  ]);
  try { const answer = await answerQuestion("三山两塔", [], "zh", undefined, index); assert.equal(answer.mode, "rag"); assert.equal(provider.count(), 4); assert.ok(answer.trace.warnings.some(w => w.includes("修正"))); }
  finally { provider.restore(); }
});
test("failed evidence repair falls back without fake citations", async () => {
  const provider = fakeProvider([
    modelResponse({ status: "full", supportedTopics: ["三山两塔"], missing: [], conflict: false }),
    modelResponse({ claims: [] }), modelResponse({ claims: [] }),
    { choices: [{ message: { content: "可以从南后街开始漫步，这是游览建议。" } }] },
  ]);
  try { const answer = await answerQuestion("三山两塔", [], "zh", undefined, index); assert.equal(answer.mode, "model"); assert.equal(provider.count(), 4); assert.equal(answer.sources.length, 0); assert.ok(answer.intro.includes("游览建议")); }
  finally { provider.restore(); }
});
test("live-only questions never generate answers from historical documents", async () => {
  const provider = fakeProvider([modelResponse({ status: "none", supportedTopics: [], missing: ["今天开放情况需要最新公告"], conflict: false }), { choices: [{ message: { content: "我无法确认今天开放情况，请查看最新公告。" } }] }]);
  try { const answer = await answerQuestion("三山今天开放吗", [], "zh", undefined, index); assert.equal(answer.mode, "refused"); assert.equal(provider.count(), 0); assert.ok(answer.intro.includes("最新公告")); assert.equal(answer.sources.length, 0); }
  finally { provider.restore(); }
});
test("no-hit fallback answers the original question with history and no decomposition", async () => {
  const provider = fakeProvider([{ choices: [{ message: { content: "这是模型的旅游建议。" } }] }]);
  try {
    const question = "给我一条游玩路线";
    const answer = await answerQuestion(question, [{ role: "user", content: "我想去三坊七巷" }], "zh", undefined, { ...index, chunks: [], parents: [] });
    assert.equal(answer.mode, "model"); assert.equal(provider.count(), 1);
    assert.deepEqual(answer.trace.queries, [question]); assert.equal(answer.sources.length, 0);
  } finally { provider.restore(); }
});
test("mocked provider adapters reject bad shapes and never leak response text", async () => {
  const provider = fakeProvider([{ choices: [] }, { data: [{ index: 0, embedding: [1, 0] }] }, { output: { results: [{ index: 2, relevance_score: 0.9 }] } }]);
  const saved = process.env.RAG_RERANK_URL;
  process.env.RAG_RERANK_URL = "https://model.invalid/rerank";
  try { await assert.rejects(() => chat("test", [])); await assert.rejects(() => embed(["text"])); await assert.rejects(() => rerank("q", ["doc"])); }
  finally { provider.restore(); if (saved === undefined) delete process.env.RAG_RERANK_URL; else process.env.RAG_RERANK_URL = saved; }
});

test("reference resolution stays one query and rejects an invented referent", async () => {
  const history = normalizeHistory([{ role: "assistant", content: JSON.stringify({ sections: [{ text: "三坊七巷位于福州。" }] }) }]);
  assert.equal(history[0].content, "三坊七巷位于福州。");
  const provider = fakeProvider([modelResponse({ referent: "三坊七巷", query: "三坊七巷怎么安排半日游？" }), modelResponse({ referent: "北京", query: "北京怎么走？" })]);
  try {
    assert.equal(await resolveReference("那里怎么安排半日游？", history), "三坊七巷怎么安排半日游？");
    await assert.rejects(() => resolveReference("那里怎么走？", history), /CLARIFY_REFERENCE/);
  } finally { provider.restore(); }
});

test("live suite contains 100 cases in ten groups including ambiguity", () => {
  assert.equal(liveCases.length, 100);
  assert.equal(new Set(liveCases.map(c=>c.id)).size,100);
  for(const group of new Set(liveCases.map(c=>c.group))) assert.equal(liveCases.filter(c=>c.group===group).length,10);
  assert.equal(liveCases.filter(c=>c.clarify).length,10);
});

test("request logs isolate concurrent contexts and redact secrets",async()=>{
  const saved=console.info, level=process.env.RAG_LOG_LEVEL;
  const rows: {requestId:string;event:string;[key:string]:unknown}[]=[];
  console.info=(_prefix:unknown,line:unknown)=>{rows.push(JSON.parse(String(line)));};
  process.env.RAG_LOG_LEVEL="debug";
  try {
    await Promise.all(["a","b"].map(tag=>withRagLog(async()=>{
      ragLog(`${tag}.start`,{apiKey:"secret",question:"sk-test-secret 13812345678 test@example.com"},"DEBUG");
      await Promise.resolve(); ragLog(`${tag}.end`);
    })));
    assert.equal(rows[0].requestId,rows.find(r=>r.event==="a.end")?.requestId);
    assert.notEqual(rows[0].requestId,rows.find(r=>r.event==="b.end")?.requestId);
    const output=JSON.stringify(rows);
    for(const secret of ["sk-test-secret","13812345678","test@example.com","apiKey"]) assert.ok(!output.includes(secret));
    process.env.RAG_LOG_LEVEL="info";
    const before=rows.length;
    withRagLog(()=>ragLog("hidden",{question:"private"},"DEBUG"));
    assert.equal(rows.length,before);
  } finally {console.info=saved;if(level===undefined)delete process.env.RAG_LOG_LEVEL;else process.env.RAG_LOG_LEVEL=level;}
});

test("follow-up duration, elderly and ordinal preserve single queries", async () => {
  const history = [{role:"assistant" as const,content:JSON.stringify({sections:[],intro:"",advice:"第一站三坊七巷，第二站上下杭。"})}];
  const context = normalizeHistory(history);
  assert.ok(context[0].content.includes("第二站上下杭"));
  const provider = fakeProvider([
    modelResponse({referent:"三坊七巷",query:"三坊七巷换成一天怎么安排？"}),
    modelResponse({referent:"三坊七巷",query:"三坊七巷带老人怎么安排？"}),
    modelResponse({referent:"上下杭",query:"上下杭怎么玩？"}),
  ]);
  try {
    assert.equal(await resolveReference("换成一天呢？",context),"三坊七巷换成一天怎么安排？");
    assert.equal(await resolveReference("带老人怎么安排？",context),"三坊七巷带老人怎么安排？");
    assert.equal(await resolveReference("第二个景点怎么玩？",context),"上下杭怎么玩？");
  } finally {provider.restore();}
});

test("ambiguous follow-up asks clarification without retrieving or inventing a target", async()=>{
  const provider=fakeProvider([modelResponse({referent:"",query:""})]);
  try {
    const answer=await answerQuestion("那里怎么去？",[{role:"user",content:"三坊七巷和上下杭我还没决定"}],"zh",undefined,index);
    assert.equal(answer.mode,"general"); assert.ok(answer.intro.includes("哪个"));
    assert.equal(answer.trace.retrieval,undefined); assert.equal(provider.count(),1);
  } finally {provider.restore();}
});

test("partial answer preserves verified citations and adds separate uncited suggestions", async () => {
  const provider = fakeProvider([
    modelResponse({ status: "partial", supportedTopics: ["三山两塔"], missing: ["游玩顺序"], conflict: false }),
    modelResponse({ insufficient: false, claims: [{ text: "三山指于山、乌山、屏山。", source: parsed.parents[0].id, quote: "三山指于山、乌山、屏山", kind: "fact" }] }),
    modelResponse({ supported: true, complete: true, conflict: false }),
    { choices: [{ message: { content: "建议先游于山，再视体力安排乌山，预留半天。" } }] },
  ]);
  try {
    const answer = await answerQuestion("三山两塔是什么，给我游玩顺序", [], "zh", undefined, index);
    assert.equal(answer.mode, "rag"); assert.equal(answer.sources.length, 1);
    assert.ok(answer.advice?.includes("未经本地资料核验"));
    assert.ok(answerParagraph(answer).includes("先游于山"));
    assert.deepEqual(answer.trace.queries, ["三山两塔是什么，给我游玩顺序"]);
  } finally { provider.restore(); }
});
