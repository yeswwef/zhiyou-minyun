/**
 * @module-note features/rag/stream.ts
 * SSE事件契约和增量解码：兼容UTF-8跨块、帧边界与心跳，拒绝残缺消息。
 */
// Both provider SSE and application SSE may split UTF-8 and frames at arbitrary boundaries.
/**
 * 增量解码 SSE 帧，兼容 UTF-8 跨网络分块并拒绝不完整消息。
 * 输入：body、onData；类型与可选项见函数签名。
 */
export async function readSse(body: ReadableStream<Uint8Array>, onData: (data: string) => void) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  /**
   * 从已接收缓冲中提取完整 SSE 帧，保留未完成的尾部。
   */
  const drain = () => {
    let match: RegExpExecArray | null;
    while ((match = /\r?\n\r?\n/.exec(buffer))) {
      const frame = buffer.slice(0, match.index);
      buffer = buffer.slice(match.index + match[0].length);
      const data = frame.split(/\r?\n/).filter(l => l.startsWith("data:")).map(l => l.slice(5).replace(/^ /, "")).join("\n");
      if (data) onData(data);
    }
  };
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }); drain();
      if (buffer.length > 1000000) throw new Error("STREAM_FRAME_TOO_LARGE");
    }
    buffer += decoder.decode(); drain();
    if (buffer.trim()) throw new Error("INCOMPLETE_STREAM_FRAME");
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}

export type AnswerEvent = { type: "status" | "delta" | "replace"; text: string };
