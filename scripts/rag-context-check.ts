/**
 * @module-note scripts/rag-context-check.ts
 * 开发运维入口：执行导入、诊断或评估任务；运行前确认环境和命令参数。
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());
/**
 * 执行 rag-context-check.ts 的命令行主流程，初始化依赖并处理最终结果。
 */
async function main(){
 const original=globalThis.fetch;
 globalThis.fetch=async(...args)=>{const r=await original(...args);const d=await r.clone().json();console.log(d.choices?.[0]?.message?.content || 'NO_CONTENT');return r;};
 const {resolveReference}=await import('../features/rag/context');
 console.log(await resolveReference('换成一天呢？',[{role:'user',content:'帮我安排三坊七巷半日游路线'}]));
}
main().catch(e=>console.error(e.message));
