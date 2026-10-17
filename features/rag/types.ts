/**
 * @module-note features/rag/types.ts
 * RAG知识问答：原始TXT经索引构建后，以关键词与向量混合检索提供证据，再由模型生成及核验。
 */
/** 子块用于检索；parentId找回上下文，行号与hash定位原文，vector缺省时仅参与词法检索。 */
export type Chunk = {
  id: string; parentId: string; file: string; hash: string; title: string;
  category: string; text: string; lineStart: number; lineEnd: number;
  access: "public"; kind: "topic" | "guidance"; vector?: number[];
};
/** 父块保存完整主题或问答，供子块命中后扩展证据。 */
export type Parent = Omit<Chunk, "parentId" | "vector">;
/** 索引快照；embedding和dimensions须与查询模型身份一致，才能进行向量检索。 */
export type Index = {
  schema: 1; version: string; builtAt: string; embedding: string | null;
  dimensions: number; parents: Parent[]; chunks: Chunk[];
};
/** 本地引用原文与定位信息；可回查不代表已在官网核实其事实。 */
export type Citation = {
  id: string; chunkId: string; title: string; file: string; hash: string;
  lineStart: number; lineEnd: number; quote: string;
};
/** 网页来源不伪造本地行号或原文。accessedAt 是查询时间，不是网页发布时间。 */
export type WebSource = { id: string; title: string; url: string; accessedAt: string };
/** 返回契约：sections保存正文，advice保存补充建议，trace用于阶段、耗时和降级诊断。 */
export type RagAnswer = {
  title: string; intro: string;
  sections: { title: string; text: string; source?: string }[];
  advice?: string; sources: Citation[];
  /** 回答完成后生成的推荐追问；旧历史记录可以没有此字段。 */
  followUpQuestions?: string[];
  webSources?: WebSource[];
  mode: "rag" | "extractive" | "general" | "model" | "refused" | "web";
  trace: { version?: string; route: string; queries: string[]; warnings: string[]; elapsedMs: number; firstTextMs?: number; stages?: { name: string; elapsedMs: number }[];
    web?: { attempted: boolean; reason: string; status: "success" | "failed" | "disabled"; sourceCount: number };
    retrieval?: { titles: string[]; dense: boolean; reranked: boolean } };
};
/** 多轮历史消息；历史回答不自动成为权威证据。 */
export type Message = { role: "user" | "assistant"; content: string };
/** 候选及各阶段分数；不同算法分数不能直接当作统一置信度。 */
export type Hit = { chunk: Chunk; score: number; lexical: number; dense: number; rerank?: number };
