/**
 * @module-note features/ai-chat/AnswerContent.tsx
 * 问答展示层：负责用户交互和回答排版；检索及模型调用由服务端接口承担。
 */
import React from "react";
import { formatAnswerText } from "./presentation";

// Deliberately support only headings, lists and emphasis. Model output is text,
// never HTML, so source documents cannot inject executable markup.
/**
 * 将配对的双星号转换为加粗节点；其他内容按普通文本转义，不执行 HTML。
 * 输入：text；类型与可选项见函数签名。
 */
function inline(text: string) {
  return text.split(/(\*\*[^*\n]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4
      ? <strong key={i}>{part.slice(2, -2)}</strong> : part);
}

/**
 * 把回答文本渲染为子标题、段落和列表，支持流式不完整内容。
 */
export function AnswerContent({ text, className }: { text: string; className?: string }) {
  const lines = formatAnswerText(text).split("\n");
  const blocks: React.ReactNode[] = [];
  let items: string[] = [];
  /**
   * 把暂存的列表项输出为列表节点并清空缓冲。
   */
  const flush = () => {
    if (items.length) {
      blocks.push(<ul key={blocks.length}>{items.map((item, i) => <li key={i}>{inline(item)}</li>)}</ul>);
      items = [];
    }
  };
  for (const line of lines) {
    const value = line.trim();
    if (!value) continue;
    const bullet = value.match(/^[-*•]\s+(.+)$/);
    if (bullet) { items.push(bullet[1]); continue; }
    flush();
    const heading = value.match(/^#{1,4}\s+(.+)$/) ?? value.match(/^\*\*([^*]+)\*\*[:：]?$/);
    blocks.push(heading
      ? <h3 key={blocks.length}>{inline(heading[1])}</h3>
      : <p key={blocks.length}>{inline(value)}</p>);
  }
  flush();
  return <div className={className}>{blocks}</div>;
}
