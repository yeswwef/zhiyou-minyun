/**
 * @module-note scripts/rag-live-eval.ts
 * 开发运维入口：执行导入、诊断或评估任务；运行前确认环境和命令参数。
 */
import { loadEnvConfig } from "@next/env";
import { writeFile } from "node:fs/promises";
import path from "node:path";
loadEnvConfig(process.cwd());

/**
 * 执行 rag-live-eval.ts 的命令行主流程，初始化依赖并处理最终结果。
 */
async function main() {
  const { answerQuestion } = await import("../features/rag/pipeline");
  const { answerParagraph } = await import("../features/ai-chat/presentation");
  const { config } = await import("../features/rag/config");
  const cases = [
    { id: "synonym", question: "福州为什么叫榕城呀？", expected: "榕城", checks: ["榕"], history: [] },
    { id: "route", question: "给我一条三坊七巷半日游路线，说明顺序和大致时间", expected: "三坊七巷", checks: ["三坊七巷|南后街", "先|起点|开始|→", "小时|分钟|上午|下午"], history: [] },
    { id: "followup", question: "那里怎么安排半日游？", expected: "三坊七巷", checks: ["三坊七巷|南后街", "小时|分钟|上午|下午"], history: [{ role: "user" as const, content: "我想去三坊七巷看看" }] },
    { id: "study", question: "泉州海丝研学一天怎么走？", expected: "泉州", checks: ["开元寺", "西街"], history: [] },
    { id: "live-boundary", question: "那里今天还有多少张票？", expected: "三坊七巷", checks: ["无法|不能|实时|查询|公告|确认"], history: [{ role: "user" as const, content: "我想去三坊七巷看看" }] },
  ];
  const results = [];
  for (const c of cases) {
    const answer = await answerQuestion(c.question, c.history);
    const text = answerParagraph(answer);
    const hit = answer.trace.retrieval?.titles.some(t => t.includes(c.expected)) ?? false;
    // Reproducible checklist proxy, NOT an assertion of factual correctness or independent human grading.
    const completeness = c.checks.every(p => new RegExp(p).test(text)) && answer.mode !== "refused";
    results.push({ id: c.id, question: c.question, hit, completeness, mode: answer.mode, text, trace: answer.trace });
    console.log(JSON.stringify({ id: c.id, hit, completeness, ms: answer.trace.elapsedMs, reranked: answer.trace.retrieval?.reranked }));
  }
  const times = results.map(r => r.trace.elapsedMs).sort((a,b) => a-b);
  const report = { at: new Date().toISOString(), scope: "Five real API smoke cases; completeness is a keyword checklist proxy requiring human review", hitRate: results.filter(r=>r.hit).length/results.length,
    completenessRate: results.filter(r=>r.completeness).length/results.length, meanMs: times.reduce((a,b)=>a+b,0)/times.length, p95Ms: times[Math.ceil(times.length*.95)-1], results };
  await writeFile(path.join(config().dataDir, "live-eval-report.json"), JSON.stringify(report,null,2));
  console.log(JSON.stringify({ hitRate: report.hitRate, completenessRate: report.completenessRate, meanMs: report.meanMs, p95Ms: report.p95Ms }));
  if (results.some(r=>!r.completeness || !r.hit || !r.trace.retrieval?.reranked)) process.exitCode=1;
}
main().catch(() => { console.error("Live evaluation failed; check model configuration/connectivity."); process.exitCode=1; });
