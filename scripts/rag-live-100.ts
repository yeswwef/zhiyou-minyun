/**
 * @module-note scripts/rag-live-100.ts
 * 开发运维入口：执行导入、诊断或评估任务；运行前确认环境和命令参数。
 */
import { loadEnvConfig } from "@next/env";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { liveCases } from "../tests/rag-live-cases";
loadEnvConfig(process.cwd());
/**
 * 执行 rag-live-100.ts 的命令行主流程，初始化依赖并处理最终结果。
 */
async function main() {
  const { answerQuestion } = await import("../features/rag/pipeline");
  const { answerParagraph } = await import("../features/ai-chat/presentation");
  const { config } = await import("../features/rag/config");
  const limit = Number(process.argv.find(a=>a.startsWith("--limit="))?.split("=")[1] || 100);
  if(!Number.isInteger(limit) || limit<1 || limit>100) throw new Error("Invalid limit");
  const group = process.argv.find(a=>a.startsWith("--group="))?.split("=")[1];
  if(group && !liveCases.some(c=>c.group===group)) throw new Error("Invalid group");
  const cases = liveCases.filter(c=>!group || c.group===group).slice(0,limit);
  const suffix = group ? `-${group}` : "";
  const results: Record<string, unknown>[] = [];
  let next = 0;
  /**
   * 从共享案例游标取题并执行实测，记录结果与进度。
   */
  async function worker() {
    while(next<cases.length) {
      const c = cases[next++];
      try {
        const answer = await answerQuestion(c.question,c.history,"zh",undefined,undefined,()=>{});
        const text = answerParagraph(answer);
        const hit = c.clarify ? null : answer.trace.retrieval?.titles.some(t=>t.includes(c.expected)) ?? false;
        const completeness = c.checks.every(p=>new RegExp(p).test(text)) && answer.mode!=="refused";
        results.push({ id:c.id, group:c.group, question:c.question, hit, completeness, mode:answer.mode, text, trace:answer.trace, humanReview:"pending" });
        console.log(JSON.stringify({id:c.id,hit,completeness,ms:answer.trace.elapsedMs}));
      } catch { results.push({id:c.id,group:c.group,error:"REQUEST_FAILED",completeness:false,humanReview:"pending"}); }
    }
  }
  // Two workers bound paid API concurrency. Progress file is not the final report.
  const checkpoint = setInterval(()=>{void writeFile(path.join(config().dataDir,`live-eval-progress${suffix}.json`),JSON.stringify({completed:results.length,total:cases.length,results},null,2)).catch(()=>{});},15000);
  try { await Promise.all([worker(),worker()]); } finally { clearInterval(checkpoint); }
  const retrieved = results.filter(r=>typeof r.hit==="boolean");
  const times = results.map(r=>(r.trace as {elapsedMs?:number})?.elapsedMs).filter((n):n is number=>typeof n==="number").sort((a,b)=>a-b);
  const report = {at:new Date().toISOString(),scope:"100 curated cases; keyword completeness is a proxy, human factual review remains pending",total:cases.length,completed:results.length,
    hitRate:retrieved.filter(r=>r.hit).length/Math.max(1,retrieved.length),completenessRate:results.filter(r=>r.completeness).length/results.length,
    meanMs:times.reduce((a,b)=>a+b,0)/Math.max(1,times.length),p95Ms:times[Math.ceil(times.length*.95)-1],results};
  await writeFile(path.join(config().dataDir,`live-eval-report${suffix}.json`),JSON.stringify(report,null,2));
  console.log(JSON.stringify({...report,results:undefined}));
  if(results.some(r=>!r.completeness)) process.exitCode=1;
}
main().catch(()=>{console.error("Live evaluation failed; inspect model configuration/connectivity");process.exitCode=1;});
