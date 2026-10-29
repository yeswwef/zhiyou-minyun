/**
 * @module-note features/rag/providers.ts
 * 模型接口适配：调用聊天、Embedding和Rerank服务，检查响应、超时及流式结束标记。
 */
import { config } from "./config";
import type { Message } from "./types";
import { readSse } from "./stream";
import { logged } from "./logger";

// Only server-controlled URLs are accepted; errors never include credentials or response bodies.
/**
 * 向模型服务发送 JSON 请求，设置超时并统一处理 HTTP 错误。
 * 输入：url、payload；类型与可选项见函数签名。
 */
async function post(url: string, payload: unknown) {
  const c = config();
  if (!c.key) throw new Error("MODEL_NOT_CONFIGURED");
  const response = await fetch(url, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${c.key}` },
    body: JSON.stringify(payload), signal: AbortSignal.timeout(60000), cache: "no-store",
  });
  if (!response.ok) throw new Error(`MODEL_HTTP_${response.status}`);
  return response.json();
}

/**
 * 检查模型调用所需的配置是否存在；不代表远端接口一定可用。
 */
export function modelReady() { const c = config(); return Boolean(c.key && c.base); }

/**
 * 调用聊天模型并处理当前调用所需的事件或日志。
 * 输入：system、messages、onDelta；类型与可选项见函数签名。
 */
export async function chat(system: string, messages: Message[], onDelta?: (text: string) => void): Promise<string> {
  const purpose=system.includes("生成后续问题")?"followups.generate":system.includes("只还原指代")?"context.resolve":system.includes("证据审查员")?"evidence.audit":system.includes("独立审核")?"validation.semantic":system.includes("补充回答")?"supplement":"generation";
  const c = config();
  // 核验与追问用独立模型并限制输出长度；只有正文生成用主模型。
  const fast = purpose !== "generation" && purpose !== "supplement";
  const model = purpose === "evidence.audit" ? c.auditModel
    : purpose === "followups.generate" ? c.followupModel
      : fast ? c.fastModel : c.model;
  const maxTokens = purpose === "followups.generate" ? 500 : purpose === "evidence.audit" ? 1200 : purpose === "context.resolve" ? 300 : 2000;
  return logged(purpose,{model,streaming:Boolean(onDelta)},()=>chatInternal(system,messages,onDelta,model,maxTokens));
}
/**
 * 执行聊天接口调用，按配置解析普通结果或 SSE 增量内容。
 * 输入：system、messages、onDelta；类型与可选项见函数签名。
 */
async function chatInternal(system: string, messages: Message[], onDelta?: (text: string) => void, model = config().model, maxTokens = 2000): Promise<string> {
  const c = config();
  if (onDelta) {
    const response = await fetch(`${c.base}/chat/completions`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${c.key}` },
      body: JSON.stringify({
        model, temperature: 0, max_tokens: maxTokens, stream: true, enable_thinking: false,
        messages: [{ role: "system", content: system }, ...messages],
      }),
      signal: AbortSignal.timeout(60000), cache: "no-store",
    });
    if (!response.ok) throw new Error(`MODEL_HTTP_${response.status}`);
    if (!response.body) throw new Error("EMPTY_STREAM");
    let text = "", ended = false;
    await readSse(response.body, raw => {
      if (raw === "[DONE]") { ended = true; return; }
      const data = JSON.parse(raw);
      if (data.error) throw new Error("MODEL_STREAM_ERROR");
      const delta = data.choices?.[0]?.delta?.content;
      if (typeof delta === "string") { text += delta; if (text.length > 20000) throw new Error("RESPONSE_TOO_LONG"); onDelta(delta); }
    });
    if (!ended) throw new Error("INCOMPLETE_MODEL_STREAM");
    return text;
  }
  const data = await post(`${c.base}/chat/completions`, {
    model, temperature: 0, max_tokens: maxTokens, enable_thinking: false,
    messages: [{ role: "system", content: system }, ...messages],
  });
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.length > 20000) throw new Error("INVALID_CHAT_RESPONSE");
  return content;
}

/**
 * 解析模型返回的 JSON 文本并兼容代码围栏。
 * 输入：text；类型与可选项见函数签名。
 */
export function parseJson(text: string): unknown {
  return JSON.parse(text.trim().replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, ""));
}

/**
 * 调用文本向量服务并记录向量化步骤日志。
 * 输入：texts；类型与可选项见函数签名。
 */
export async function embed(texts: string[]): Promise<number[][]> {
  return logged("embedding",{model:config().embedding,dimensions:config().dimensions,count:texts.length},()=>embedInternal(texts));
}
/**
 * 批量请求向量，检查返回数量、维度及数值合法性。
 * 输入：texts；类型与可选项见函数签名。
 */
async function embedInternal(texts: string[]): Promise<number[][]> {
  if (!texts.length) return [];
  const c = config();
  const data = await post(`${c.base}/embeddings`, {
    model: c.embedding, input: texts, dimensions: c.dimensions, encoding_format: "float",
  });
  if (!Array.isArray(data.data) || data.data.length !== texts.length) throw new Error("INVALID_EMBEDDING_RESPONSE");
  const rows = data.data.sort((a: { index: number }, b: { index: number }) => a.index - b.index);
  return rows.map((row: { index: number; embedding: number[] }, i: number) => {
    if (row.index !== i || !Array.isArray(row.embedding) || row.embedding.length !== c.dimensions ||
      row.embedding.some((v: number) => typeof v !== "number" || !Number.isFinite(v)) ||
      !row.embedding.some((v: number) => v !== 0)) throw new Error("INVALID_VECTOR");
    return row.embedding;
  });
}

/**
 * 调用重排服务并记录耗时。
 * 输入：query、documents；类型与可选项见函数签名。
 */
export async function rerank(query: string, documents: string[]): Promise<{ index: number; score: number }[]> {
  return logged("rerank",{model:config().rerankModel,count:documents.length},()=>rerankInternal(query,documents));
}
/**
 * 发送问题与候选文档，校验并返回重排索引及分数。
 * 输入：query、documents；类型与可选项见函数签名。
 */
async function rerankInternal(query: string, documents: string[]): Promise<{ index: number; score: number }[]> {
  const c = config();
  if (!c.rerankUrl) throw new Error("RERANK_NOT_CONFIGURED");
  // DashScope gte-rerank-v2 protocol, NOT an arbitrary provider's /rerank protocol.
  const data = await post(c.rerankUrl, {
    model: c.rerankModel, input: { query, documents }, parameters: { top_n: documents.length, return_documents: false },
  });
  const rows = data?.output?.results;
  if (!Array.isArray(rows) || rows.length !== documents.length) throw new Error("INVALID_RERANK_RESPONSE");
  const seen = new Set<number>();
  return rows.map((row: { index: number; relevance_score: number }) => {
    if (!Number.isInteger(row.index) || row.index < 0 || row.index >= documents.length || seen.has(row.index) ||
      !Number.isFinite(row.relevance_score) || row.relevance_score < 0 || row.relevance_score > 1) throw new Error("INVALID_RERANK_RESPONSE");
    seen.add(row.index);
    return { index: row.index, score: row.relevance_score };
  });
}

/** 与 post 相同的 JSON 请求，但允许自定义超时；供图片识景与结构化生成使用。 */
async function postModel(url: string, payload: unknown, timeoutMs = 60000) {
  const c = config();
  if (!c.key) throw new Error("MODEL_NOT_CONFIGURED");
  const response = await fetch(url, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${c.key}` },
    body: JSON.stringify(payload), signal: AbortSignal.timeout(timeoutMs), cache: "no-store",
  });
  if (!response.ok) throw new Error(`MODEL_HTTP_${response.status}`);
  return response.json();
}

/**
 * 调用视觉模型识别图片，要求返回结构化 JSON 文本。
 * 输入：system、prompt、imageUrl；类型与可选项见函数签名。
 */
export async function chatVision(system: string, prompt: string, imageUrl: string): Promise<string> {
  return logged("vision.identify", { model: config().vl }, async () => {
    const c = config();
    if (!c.key) throw new Error("MODEL_NOT_CONFIGURED");
    const data = await postModel(`${c.base}/chat/completions`, {
      model: c.vl, temperature: 0, max_tokens: 1200, enable_thinking: false,
      messages: [
        { role: "system", content: system },
        { role: "user", content: [
          { type: "image_url", image_url: { url: imageUrl } },
          { type: "text", text: prompt },
        ] },
      ],
    }, 60000);
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim() || content.length > 20000) throw new Error("INVALID_VISION_RESPONSE");
    return content;
  });
}

/**
 * 非思考模式的结构化生成，用于识景讲解、行程规划等需要稳定 JSON 输出的场景。
 * 输入：system、user；类型与可选项见函数签名。
 */
export async function chatStructured(system: string, user: string, maxTokens = 1600): Promise<string> {
  return logged("structured.generate", { model: config().model }, async () => {
    const c = config();
    if (!c.key) throw new Error("MODEL_NOT_CONFIGURED");
    const data = await postModel(`${c.base}/chat/completions`, {
      model: c.model, temperature: 0, max_tokens: maxTokens, enable_thinking: false,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }, 60000);
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim() || content.length > 20000) throw new Error("INVALID_CHAT_RESPONSE");
    return content;
  });
}
