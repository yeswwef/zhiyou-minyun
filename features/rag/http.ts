/**
 * @module-note features/rag/http.ts
 * 按字节限制请求体读取；只限制传输大小，业务字段合法性由接口继续校验。
 */
/** Bound bytes while reading, rather than buffering an arbitrarily large request first. */
export async function readBody(request: Request, maxBytes: number): Promise<string> {
  if (Number(request.headers.get("content-length") || 0) > maxBytes) throw new Error("BODY_TOO_LARGE");
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new Error("BODY_TOO_LARGE"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let position = 0;
  for (const chunk of chunks) { bytes.set(chunk, position); position += chunk.length; }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}
