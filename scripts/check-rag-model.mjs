/**
 * @module-note scripts/check-rag-model.mjs
 * 开发运维入口：执行导入、诊断或评估任务；运行前确认环境和命令参数。
 */
// Minimal paid-provider connectivity probe; prints only status, never credentials or response bodies.
import fs from 'node:fs';
import dotenv from 'dotenv';
const env = { ...dotenv.parse(fs.readFileSync('.env')), ...dotenv.parse(fs.readFileSync('.env.local')) };
const base = env.RAG_MODEL_BASE_URL;
if (base !== 'https://dashscope.aliyuncs.com/compatible-mode/v1') throw new Error('UNEXPECTED_PROVIDER');
for (const [name, endpoint, body] of [
  ['chat', '/chat/completions', { model: env.LLM_MODEL, messages: [{ role: 'user', content: '只回复OK' }], max_tokens: 8 }],
  ['embedding', '/embeddings', { model: env.EMBEDDING_MODEL, input: ['福州三坊七巷'], dimensions: Number(env.EMBEDDING_DIM), encoding_format: 'float' }],
]) {
  try {
    const response = await fetch(base + endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.RAG_API_KEY}` }, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) });
    const data = await response.json();
    const valid = response.ok && (name === 'chat' ? typeof data.choices?.[0]?.message?.content === 'string' : data.data?.[0]?.embedding?.length === Number(env.EMBEDDING_DIM));
    console.log(JSON.stringify({ service: name, httpStatus: response.status, verified: valid }));
    if (!valid) process.exitCode = 1;
  } catch {
    console.log(JSON.stringify({ service: name, verified: false, reason: 'NETWORK_OR_RESPONSE_ERROR' }));
    process.exitCode = 1;
  }
}
