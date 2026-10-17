/**
 * @module-note scripts/rag-eval.ts
 * 开发运维入口：执行导入、诊断或评估任务；运行前确认环境和命令参数。
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "../features/rag/config";
import { retrieve } from "../features/rag/retrieve";
import { answerQuestion } from "../features/rag/pipeline";
import type { Index } from "../features/rag/types";

// Offline lexical regression only: never consume model tokens in this script.
process.env.RAG_API_KEY = ""; process.env.DASHSCOPE_API_KEY = "";
/**
 * 执行 rag-eval.ts 的命令行主流程，初始化依赖并处理最终结果。
 */
async function main() {
  const index: Index = JSON.parse(await readFile(path.join(config().dataDir, "index.json"), "utf8"));
  const faq = index.parents.filter((p) => p.kind === "guidance");
  let top1 = 0, top5 = 0;
  const misses: { question: string; expected: string; found: string[] }[] = [];
  for (const item of faq) {
    const { hits } = await retrieve(index, [item.title]);
    if (hits[0]?.chunk.parentId === item.id) top1++;
    if (hits.slice(0, 5).some((h) => h.chunk.parentId === item.id)) top5++;
    else misses.push({ question: item.title, expected: item.file, found: hits.slice(0, 5).map((h) => h.chunk.title) });
  }
  const probes = [
    { q: "今天三坊七巷还有票吗", mode: "refused" },
    { q: "quantum gravity xyz", mode: "refused" },
    { q: "三山两塔指什么？", mode: "extractive" },
    { q: "三坊七巷的三坊是哪三坊？", mode: "extractive" },
    { q: "福州为什么又叫榕城？", mode: "extractive" },
  ];
  const checks = [];
  for (const probe of probes) { const result = await answerQuestion(probe.q, [], "zh", undefined, index); checks.push({ ...probe, actual: result.mode, pass: result.mode === probe.mode }); }
  const report = { scope: "240 existing FAQ titles, not an independent semantic benchmark", version: index.version,
    at: new Date().toISOString(), cases: faq.length, top1, top5, top1Rate: top1 / faq.length, top5Rate: top5 / faq.length, misses, checks };
  await writeFile(path.join(config().dataDir, "eval-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (top5 < faq.length * 0.95 || checks.some((c) => !c.pass)) process.exitCode = 1;
}
main().catch(() => { console.error("评测失败：请先运行 rag:ingest，并从项目根目录运行。"); process.exitCode = 1; });
