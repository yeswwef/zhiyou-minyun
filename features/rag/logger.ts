/**
 * @module-note features/rag/logger.ts
 * 结构化请求日志：异步上下文隔离requestId，输出脱敏事件、累计耗时及步骤耗时。
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

type Context = { id: string; started: number };
const context = new AsyncLocalStorage<Context>();
/**
 * 读取当前异步请求的日志上下文。
 */
export const logContext = () => context.getStore();
/**
 * 创建独立 requestId 和起始时间，使并发请求日志相互隔离。
 * 输入：work；类型与可选项见函数签名。
 */
export function withRagLog<T>(work: () => T): T {
  return context.run({ id: randomUUID(), started: Date.now() }, work);
}
/**
 * 仅允许安全的错误标识进入日志，避免异常原文泄露敏感数据。
 * 输入：error；类型与可选项见函数签名。
 */
export function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : "UNKNOWN";
  return /^[A-Z][A-Z0-9_]{1,70}$/.test(message) ? message : "INTERNAL_ERROR";
}
/**
 * 递归过滤敏感字段、脱敏并截断日志值。
 * 输入：value、depth；类型与可选项见函数签名。
 */
function clean(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[TRUNCATED]";
  if (typeof value === "string") return value
    .replace(/(?:Bearer\s+\S+|sk-[\w.\-]+)/gi,"[REDACTED]")
    .replace(/\b1[3-9]\d{9}\b/g,"[PHONE]")
    .replace(/\b\d{17}[\dXx]\b/g,"[ID]")
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g,"[EMAIL]")
    .replace(/[\r\n\t]/g," ").slice(0,240);
  if (Array.isArray(value)) return value.slice(0,18).map(v=>clean(v,depth+1));
  if(value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([k])=>!/(key|token|password|authorization|cookie|prompt|history|vector|content|body)/i.test(k)).map(([k,v])=>[k,clean(v,depth+1)]));
  return value;
}
/**
 * 在当前请求上下文输出结构化日志，遵循级别与关闭配置。
 * 输入：event、fields、level；类型与可选项见函数签名。
 */
export function ragLog(event: string, fields: Record<string,unknown> = {}, level: "INFO"|"WARN"|"ERROR"|"DEBUG" = "INFO") {
  const c=context.getStore();
  if (!c || process.env.RAG_LOG_LEVEL === "off" || (level === "DEBUG" && process.env.RAG_LOG_LEVEL !== "debug")) return;
  const row={time:new Date().toISOString(),level,requestId:c.id,event,elapsedMs:Date.now()-c.started,...clean(fields) as object};
  const output=JSON.stringify(row);
  if(level==="ERROR") console.error("[RAG]",output); else if(level==="WARN") console.warn("[RAG]",output); else console.info("[RAG]",output);
}
/**
 * 包装异步步骤，统一记录开始、完成、失败及独立耗时。
 * 输入：event、fields、work；类型与可选项见函数签名。
 */
export async function logged<T>(event:string, fields:Record<string,unknown>, work:()=>Promise<T>):Promise<T> {
  const start=Date.now(); ragLog(`${event}.start`,fields);
  try { const result=await work(); ragLog(`${event}.complete`,{...fields,durationMs:Date.now()-start});return result; }
  catch(error){ragLog(`${event}.failed`,{...fields,durationMs:Date.now()-start,code:safeError(error)},"WARN");throw error;}
}
