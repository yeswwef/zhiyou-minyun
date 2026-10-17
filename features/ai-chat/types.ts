/**
 * @module-note features/ai-chat/types.ts
 * 问答展示层：负责用户交互和回答排版；检索及模型调用由服务端接口承担。
 */
import type { RagAnswer, Citation } from "@/features/rag/types";
export type Language = "zh" | "en";
export type Source = Citation;
export type Turn = { id: string; question: string; answer: RagAnswer; requestId?: string; durationMs?: number };
export type Conversation = { id: string; title: string; turns: Turn[]; sessionId?: string };
