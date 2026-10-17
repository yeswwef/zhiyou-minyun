/** 手动执行一次真实联网检查。仅读取本地环境配置，不输出密钥、不导入索引。 */
import { loadEnvConfig } from "@next/env";
import { searchAnswer, webReady } from "../features/rag/web";
import { safeError } from "../features/rag/logger";
loadEnvConfig(process.cwd());
async function main() {
  if (!webReady()) throw new Error("WEB_NOT_CONFIGURED");
  const start = Date.now();
  const result = await searchAnswer("福州三坊七巷有哪些代表性建筑？请参考官方网页简短介绍。", "zh");
  console.log(JSON.stringify({ ok: true, durationMs: Date.now() - start, characters: result.text.length, sources: result.sources }, null, 2));
}
main().catch(error => { console.error(JSON.stringify({ ok: false, code: safeError(error) })); process.exitCode = 1; });
