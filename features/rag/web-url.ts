/** 无副作用的链接校验，前后端共用；绝不读取密钥或主动访问网页。 */
export function safeWebUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 2048) return;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.port ||
        !host.includes(".") || /^[\d.]+$/.test(host) || host.includes(":") ||
        /\.(local|localhost|internal|test|invalid)$/.test(host)) return;
    url.hash = "";
    return url.href;
  } catch { return; }
}
