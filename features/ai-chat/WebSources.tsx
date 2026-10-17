import type { WebSource } from "../rag/types";
import { safeWebUrl } from "../rag/web-url";

/** 展示供应商实际返回且被答案引用的网页；再次过滤历史记录中的不安全链接。 */
export function WebSources({ sources, english = false }: { sources: WebSource[]; english?: boolean }) {
  return <section aria-label={english ? "Web sources" : "网页来源"}>
    <h3>{english ? "Web sources" : "联网参考网页"}</h3>
    {sources.map(source => {
      const url = safeWebUrl(source.url);
      if (!url) return null;
      return <p key={url} style={{ margin: "16px 0", overflowWrap: "anywhere" }}>
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: "#c75b43", textDecoration: "underline" }}>{source.title} ↗</a>
        <small style={{ display: "block" }}>{new URL(url).hostname}</small>
      </p>;
    })}
    <p>{english ? "External pages supplied by Bailian search; content may change. Reference mapping is not independent factual verification." : "由百炼联网搜索提供，外部网页内容可能变化；引用对应关系校验不等于独立事实核验。"}</p>
  </section>;
}
