/**
 * @module-note features/rag/config.ts
 * RAG服务端配置：集中读取知识目录、索引目录、模型服务和维度，密钥不得发送到客户端。
 */
import path from "node:path";

/**
 * 集中读取 RAG 环境配置、模型身份与本地目录；密钥仅供服务端使用。
 */
export function config() {
  return {
    sourceDir: path.resolve(process.env.RAG_SOURCE_DIR || path.join(process.cwd(), "..", "fuzhou_rag")),
    dataDir: path.resolve(process.env.RAG_DATA_DIR || path.join(process.cwd(), ".data", "rag")),
    key: process.env.RAG_API_KEY || process.env.DASHSCOPE_API_KEY || "",
    base: (process.env.RAG_MODEL_BASE_URL || process.env.DASHSCOPE_BASE_URL || "").replace(/\/$/, ""),
    model: process.env.LLM_MODEL || "qwen-plus",
    // 视觉模型必须单独配置：文本模型（qwen-plus）看不到图片，实测会把纯红图答成蓝色。
    // 2026-10-21 修正：识景此前误用 model，导致识别结果恒为「未知」。
    vl: process.env.VL_MODEL || "qwen3-vl-plus",
    // 联网独立模型与开关；现有兼容接口模型不一定支持原生联网。
    webEnabled: process.env.RAG_WEB_ENABLED !== "false",
    webModel: process.env.RAG_WEB_MODEL || "qwen-plus",
    webTimeoutMs: Math.min(60000, Math.max(5000, Number(process.env.RAG_WEB_TIMEOUT_MS) || 30000)),
    embedding: process.env.EMBEDDING_MODEL || "text-embedding-v3",
    dimensions: Number(process.env.EMBEDDING_DIM || 1024),
    rerankUrl: process.env.RAG_RERANK_URL ?? ((process.env.RAG_MODEL_BASE_URL || process.env.DASHSCOPE_BASE_URL || "").startsWith("https://dashscope.aliyuncs.com/") ? "https://dashscope.aliyuncs.com/api/v1/services/rerank/text-rerank/text-rerank" : ""),
    rerankModel: process.env.RAG_RERANK_MODEL || "gte-rerank-v2",
  };
}
