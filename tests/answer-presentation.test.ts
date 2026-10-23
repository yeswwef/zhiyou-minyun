/**
 * @module-note tests/answer-presentation.test.ts
 * 自动化验证：断言覆盖预期行为，模拟测试不代表真实模型或生产环境验收通过。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { answerParagraph } from "../features/ai-chat/presentation";
import type { RagAnswer } from "../features/rag/types";

const answer: RagAnswer = { mode: "rag", title: "根据本地知识库回答", intro: "资料说明", sources: [],
  trace: { route: "knowledge", queries: [], warnings: [], elapsedMs: 1000 },
  sections: [{ title: "资料说明 1", text: "三山指于山、乌山、屏山", source: "1" },
    { title: "资料说明 2", text: "两塔指白塔和乌塔。", source: "2" }] };
test("renders a single paragraph without headings or citation numbers", () => {
  assert.equal(answerParagraph(answer), "三山指于山、乌山、屏山。 两塔指白塔和乌塔。");
});
test("retains refusal and general answers", () => {
  assert.equal(answerParagraph({ ...answer, mode: "refused", sections: [], intro: "证据不足，请补充问题。" }), "证据不足，请补充问题。");
});
test("preserves inference labels and removes exact duplicates", () => {
  assert.equal(answerParagraph({ ...answer, sections: [answer.sections[0], answer.sections[0], { title: "建议 / 推断 3", text: "可分两次参观" }] }), "三山指于山、乌山、屏山。 建议／推断：可分两次参观。");
});
