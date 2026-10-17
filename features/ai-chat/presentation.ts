/**
 * @module-note features/ai-chat/presentation.ts
 * 问答展示层：负责用户交互和回答排版；检索及模型调用由服务端接口承担。
 */
import type { RagAnswer } from "@/features/rag/types";

/** 只统计真实检索式和引用文件；同一文件的多个片段不重复算作多篇资料。 */
export function retrievalSummary(answer: RagAnswer) {
  return {
    queries: answer.trace.retrieval ? [...new Set(answer.trace.queries.filter(Boolean))] : [],
    documents: new Set(answer.sources.map(source => source.file)).size,
    searched: Boolean(answer.trace.retrieval),
  };
}

// Preserve model paragraphs and recover explicit list boundaries in older answers.
// Never split on decimal points or insert/rewrite factual content.
/**
 * 保留逻辑换行并兼容旧答案的编号边界；不改变事实或小数。
 * 输入：text；类型与可选项见函数签名。
 */
export function formatAnswerText(text: string): string {
  return text.replace(/\r\n?/g, "\n")
    .replace(/([^\n])\s+(?=\d+[.、)]\s*[^\d\s])/g, "$1\n\n")
    .replace(/([^\n])\s+(?=补充建议（|Additional suggestion \()/g, "$1\n\n")
    .replace(/\n{3,}/g, "\n\n").trim();
}

// Keep verified claims intact; presentation must not introduce new facts.
/**
 * 将已核验内容与补充建议整理为展示文本，保留段落及建议标识。
 * 输入：answer；类型与可选项见函数签名。
 */
export function answerParagraph(answer: RagAnswer): string {
  const parts = answer.sections.length ? answer.sections.map((section) => {
    const text = section.text.trim();
    return /建议|推断/.test(section.title) && !/^(建议|可以考虑|推测|As a suggestion)/i.test(text)
      ? `建议／推断：${text}` : text;
  }) : answer.advice ? [] : [answer.intro];
  if (answer.advice) parts.push(answer.advice);
  return [...new Set(parts.filter(Boolean))].map(formatAnswerText).join("\n\n");
}
