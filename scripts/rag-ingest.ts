/**
 * @module-note scripts/rag-ingest.ts
 * 开发运维入口：执行导入、诊断或评估任务；运行前确认环境和命令参数。
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());
/**
 * 执行 rag-ingest.ts 的命令行主流程，初始化依赖并处理最终结果。
 */
async function main() {
  const { buildIndex } = await import("../features/rag/ingest");
  const index = await buildIndex(process.argv.includes("--vectors"));
  console.log(JSON.stringify({ version: index.version, parents: index.parents.length, chunks: index.chunks.length,
    files: new Set(index.chunks.map((c) => c.file)).size, vectorized: Boolean(index.embedding) }, null, 2));
}
main().catch(() => { console.error("索引构建失败；检查目录、ingest.lock、模型配置与连接。旧索引未被部分覆盖。"); process.exitCode = 1; });
