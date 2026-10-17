/**
 * @module-note scripts/import-reference-model.mjs
 * 开发运维入口：执行导入、诊断或评估任务；运行前确认环境和命令参数。
 */
// Local configuration migration only. Never print keys or source .env contents.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import dotenv from 'dotenv';

try {
  const source = process.argv[2];
  if (!source) throw new Error('SOURCE_REQUIRED');
  execFileSync('git', ['check-ignore', '.env.local'], { stdio: 'ignore' });
  const env = dotenv.parse(fs.readFileSync(path.join(source, '.env')));
  const yaml = fs.readFileSync(path.join(source, 'config', 'rag.yml'), 'utf8');
  const key = env.DASHSCOPE_API_KEY?.trim();
  if (!key || /[\r\n]/.test(key)) throw new Error('INVALID_KEY');
  const model = yaml.match(/^chat_model_name:\s*([\w.-]+)/m)?.[1];
  const embedding = yaml.match(/^embedding_model_name:\s*([\w.-]+)/m)?.[1];
  if (!model || embedding !== 'text-embedding-v4') throw new Error('REVIEW_MODEL_CONFIG');
  const target = path.resolve('.env.local');
  let content = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
  const updates = {
    RAG_API_KEY: key,
    RAG_MODEL_BASE_URL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    LLM_MODEL: model,
    EMBEDDING_MODEL: embedding,
    EMBEDDING_DIM: '1024',
  };
  for (const [name, value] of Object.entries(updates)) {
    const line = `${name}=${JSON.stringify(value)}`;
    const expression = new RegExp(`^\\s*(?:export\\s+)?${name}=.*$`, 'gm');
    content = expression.test(content) ? content.replace(expression, () => line) : `${content.trimEnd()}\n${line}\n`;
  }
  fs.writeFileSync(target, content, { encoding: 'utf8', mode: 0o600 });
  console.log(JSON.stringify({ saved: '.env.local', keyCopied: true, chat: model, embedding, dimensions: 1024, rerank: 'not present in reference project' }));
} catch {
  console.error('配置迁移未完成，请检查源配置、目标目录及Git忽略规则。未输出任何密钥。');
  process.exitCode = 1;
}
