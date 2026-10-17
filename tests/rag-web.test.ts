/** 联网回归测试：完全模拟网络，不加载.env，不消耗真实额度。 */
import assert from "node:assert/strict";
import { test, after } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { nativeSearchEndpoint, validateWebResult, searchAnswer, webReady } from "../features/rag/web";
import { safeWebUrl } from "../features/rag/web-url";
import { answerQuestion } from "../features/rag/pipeline";
import { WebSources } from "../features/ai-chat/WebSources";
import type { Index } from "../features/rag/types";
import { parseDocument } from "../features/rag/ingest";
const env = { ...process.env }, originalFetch = globalThis.fetch;
after(() => { process.env = env; globalThis.fetch = originalFetch; });
process.env.RAG_API_KEY = "test-only";
process.env.RAG_MODEL_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";
process.env.RAG_WEB_ENABLED = "true";
process.env.RAG_RERANK_URL = "";
const rows = [{ index: 1, title: "官方介绍", url: "https://www.fuzhou.gov.cn/test" }];
function stream(text = "福州文化介绍。[ref_1]", finish = "stop") {
  return new Response(`data: ${JSON.stringify({ output: { search_info: { search_results: rows } } })}\n\ndata: ${JSON.stringify({ output: { choices: [{ message: { content: text }, finish_reason: finish }] } })}\n\n`, { headers: { "content-type": "text/event-stream" } });
}
test("endpoint accepts only official HTTPS origins", () => {
  assert.ok(nativeSearchEndpoint(process.env.RAG_MODEL_BASE_URL!));
  for (const url of ["http://dashscope.aliyuncs.com", "https://evil.com", "https://dashscope.aliyuncs.com.evil.com", "https://user@dashscope.aliyuncs.com"]) assert.equal(nativeSearchEndpoint(url), undefined);
});
test("web links reject unsafe schemes and private literal hosts", () => {
  for (const url of ["javascript:alert(1)", "http://127.0.0.1", "http://localhost", "http://a.internal", "https://u:p@example.com", "https://[::1]"]) assert.equal(safeWebUrl(url), undefined);
});
test("citations must match metadata; duplicate URLs count once", () => {
  assert.equal(validateWebResult("介绍[ref_1][ref_2]", [...rows, { ...rows[0], index: 2 }], "stop").sources.length, 1);
  for (const [text, finish] of [["介绍", "stop"], ["介绍[ref_9]", "stop"], ["介绍[ref_1]", "length"]]) assert.throws(() => validateWebResult(text, rows, finish));
});
test("native SSE sends enable_search and yields real provisional text", async () => {
  const drafts: string[] = [];
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    assert.equal(body.parameters.enable_search, true);
    assert.equal(body.parameters.search_options.forced_search, true);
    return stream();
  };
  const result = await searchAnswer("介绍福州", "zh", "", undefined, text => drafts.push(text));
  assert.equal(result.sources.length, 1); assert.ok(drafts.length); assert.ok(!result.text.includes("ref_"));
});
test("live question uses web and carries clickable metadata", async () => {
  globalThis.fetch = async () => stream();
  const answer = await answerQuestion("今天博物馆开放吗");
  assert.equal(answer.mode, "web"); assert.equal(answer.webSources?.length, 1);
});
test("failed live search refuses to invent current facts", async () => {
  globalThis.fetch = async () => new Response("", { status: 429 });
  const answer = await answerQuestion("今天博物馆开放吗");
  assert.equal(answer.mode, "refused"); assert.equal(answer.trace.web?.status, "failed");
});
test("invalid source withdraws streamed draft", async () => {
  globalThis.fetch = async () => stream("未核验临时答案[ref_99]");
  const texts: string[] = [];
  const answer = await answerQuestion("今天博物馆开放吗", [], "zh", undefined, undefined, event => { if (event.type === "replace") texts.push(event.text); });
  assert.equal(answer.mode, "refused"); assert.ok(texts[0].includes("临时")); assert.equal(texts.at(-1), "");
});
test("no local hits falls back to ordinary model after web failure", async () => {
  let webCalls = 0;
  globalThis.fetch = async url => {
    if (String(url).includes("/aigc/")) { webCalls++; return new Response("", { status: 503 }); }
    return new Response(JSON.stringify({ choices: [{ message: { content: "一般旅游建议，不代表实时信息。" } }] }));
  };
  const index: Index = { schema: 1, version: "empty", builtAt: "", embedding: null, dimensions: 0, parents: [], chunks: [] };
  const answer = await answerQuestion("介绍一处文化景点", [], "zh", undefined, index);
  assert.equal(webCalls, 1); assert.equal(answer.mode, "model"); assert.equal(answer.webSources, undefined);
});
test("disabled and aborted searches do not send network requests", async () => {
  globalThis.fetch = async () => { throw new Error("UNEXPECTED_NETWORK"); };
  process.env.RAG_WEB_ENABLED = "false";
  assert.equal(webReady(), false); await assert.rejects(searchAnswer("问题", "zh"), /WEB_NOT_CONFIGURED/);
  process.env.RAG_WEB_ENABLED = "true";
  const controller = new AbortController(); controller.abort();
  await assert.rejects(searchAnswer("问题", "zh", "", controller.signal), { name: "AbortError" });
});
test("source markup escapes titles and isolates external windows", () => {
  const html = renderToStaticMarkup(React.createElement(WebSources, { sources: [{ id: "1", title: "<script>", url: rows[0].url, accessedAt: "" }] }));
  assert.match(html, /noopener noreferrer/); assert.match(html, /&lt;script&gt;/); assert.ok(!html.includes("<script>"));
});
for (const coverage of ["full", "partial"] as const) test(`${coverage} local evidence preserves citations and controls web calls`, async () => {
  const parsed = parseDocument("01_测试.txt", "## 三山两塔\n三山指于山、乌山、屏山，两塔指白塔和乌塔。");
  const index: Index = { schema: 1, version: "test", builtAt: "", embedding: null, dimensions: 0, ...parsed };
  const responses = [
    { status: coverage, supportedTopics: ["三山两塔"], missing: coverage === "partial" ? ["游玩建议"] : [], conflict: false },
    { insufficient: false, claims: [{ text: "三山指于山、乌山、屏山。", quote: "三山指于山、乌山、屏山", source: parsed.parents[0].id, kind: "fact" }] },
    { supported: true, complete: true, conflict: false },
  ];
  let webCalls = 0;
  globalThis.fetch = async url => {
    if (String(url).includes("/aigc/")) { webCalls++; return stream(); }
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(responses.shift()) } }] }));
  };
  const answer = await answerQuestion("三山两塔是什么", [], "zh", undefined, index);
  assert.equal(answer.sources.length, 1);
  assert.equal(answer.mode, coverage === "partial" ? "web" : "rag");
  assert.equal(webCalls, coverage === "partial" ? 1 : 0);
  if (coverage === "partial") { assert.equal(answer.webSources?.length, 1); assert.ok(answer.advice?.includes("联网补充")); }
});
