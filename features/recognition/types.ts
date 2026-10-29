/**
 * @module-note features/recognition/types.ts
 * AI 图片识景：图片识别结果、带来源讲解与请求返回契约。
 */
import type { Citation, WebSource } from "@/features/rag/types";

export const RECOGNITION_CATEGORIES = ["古建筑", "文物", "牌坊", "摩崖石刻", "地标建筑", "自然景观", "其他"] as const;
export type RecognitionCategory = (typeof RECOGNITION_CATEGORIES)[number];

/** 视觉模型的识别结果；uncertain 为 true 时不应编造讲解。 */
export type RecognitionIdentity = {
  object: string;
  category: RecognitionCategory;
  confidence: number;
  evidence: string;
  keywords: string[];
  uncertain: boolean;
  /** 视觉模型判断主体是否位于福州；false 时不生成本地讲解。 */
  inFuzhou: boolean;
};

/** 讲解正文与来源；sources 来自本地知识库片段，带文件与行号。 */
export type RecognitionResult = RecognitionIdentity & {
  summary: string;
  history: string;
  heritage: string;
  sources: Citation[];
  /** true 表示讲解有本地知识库逐字引文支撑；false 表示来自模型通用知识或联网补充。 */
  grounded: boolean;
  /** 非遗知识点是否来自联网检索。 */
  heritageFromWeb?: boolean;
  /** 本地知识库缺失时的联网补充与网页来源。 */
  web?: { text: string; sources: WebSource[] };
  trace: {
    elapsedMs: number;
    dense: boolean;
    warnings: string[];
    model: string;
  };
};

export type RecognitionResponse = {
  requestId: string;
  result: RecognitionResult;
};
