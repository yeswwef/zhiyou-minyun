/**
 * @module-note features/ai-chat/demo.ts
 * 问答展示层：负责用户交互和回答排版；检索及模型调用由服务端接口承担。
 */
/** Deliberately isolated preview fixtures. These are not retrieved knowledge or official sources. */
export type Language = "zh" | "en";
export type Source = { id: string; title: string; page: number; quote: string };
export type Answer = { title: string; intro: string; sections: { title: string; text: string; source?: string }[]; advice?: string; sources: Source[] };
export type Turn = { id: string; question: string; answer: Answer };
export type Conversation = { id: string; title: string; turns: Turn[] };

/**
 * 构造指定主题与语言的演示答案，不代表实时模型结果。
 * 输入：topic、lang；类型与可选项见函数签名。
 */
export function sampleAnswer(topic: "lanes" | "tea", lang: Language): Answer {
  if (lang === "en") return {
    title: topic === "tea" ? "Discover Fuzhou through jasmine tea" : "Read the city through its lanes, homes and stories",
    intro: "This is a prepared interface example, not an answer retrieved from a knowledge base.",
    sections: [
      { title: "Look closer", text: topic === "tea" ? "Explore the relationship between tea, flowers and local craft." : "Observe courtyards, gateways and the changing rhythm of the lanes.", source: "1" },
      { title: "Follow the stories", text: "Connect what you see with the people and cultural stories presented in exhibitions.", source: "2" },
    ],
    advice: "Start with a relaxed walk, choose a topic that interests you, then explore in more detail. This is a suggested itinerary, not a verified fact.",
    sources: [{ id: "1", title: "Cultural introduction · sample", page: 3, quote: "Observe the details and spatial relationships of the cultural setting." }, { id: "2", title: "People and stories · sample", page: 6, quote: "Exhibitions connect places with personal and cultural stories." }],
  };
  return {
    title: topic === "tea" ? "一盏茉莉花茶，读懂福州的日常" : "读懂三坊七巷，从街巷、古厝与人物开始",
    intro: topic === "tea" ? "从茶香、手艺到生活习惯，可以用不同角度认识福州的茶文化。以下为页面演示文案，尚未经过知识库检索。" : "三坊七巷的看点，不只是古建筑，更是街巷格局与人文故事。可以先了解空间脉络，再选择感兴趣的故居细看。",
    sections: [
      { title: topic === "tea" ? "茶香与手艺" : "街巷与古厝", text: topic === "tea" ? "围绕茶与花的结合，了解工艺环节与地方生活之间的联系。" : "沿着街巷观察院落、门墙与建筑细节，理解传统街区的空间层次。", source: "1" },
      { title: "人物与故事", text: "结合人物故居与展陈内容，把建筑与福州的人文记忆联系起来。", source: "2" },
    ],
    advice: "首次游览可以按“街巷漫步 → 主题故居 → 自由探索”展开，根据兴趣安排停留。这是一项游览建议，并非资料事实。",
    sources: [{ id: "1", title: topic === "tea" ? "茶文化与地方生活" : "街区建筑与空间介绍", page: 3, quote: topic === "tea" ? "茶与花的结合，连接着地方手艺与日常生活。" : "街巷与院落共同构成街区的空间层次。" }, { id: "2", title: "人物故居与文化故事", page: 6, quote: "人物故居与展陈内容连接着建筑和地方文化记忆。" }],
  };
}

/**
 * 构造服务不可用时的展示文案。
 * 输入：lang；类型与可选项见函数签名。
 */
export function unavailableAnswer(lang: Language): Answer {
  return lang === "zh" ? { title: "问题已收到，真实问答即将接入", intro: "当前是前端交互预览，尚未连接大模型或 RAG 知识库，因此不能为这个问题生成有依据的答案。", sections: [{ title: "你可以继续体验", text: "切换左侧示例对话，查看引用定位；也可以继续输入，体验本次页面内的多轮消息。预约余量请前往票务页面查询。" }], sources: [] } : { title: "Your question is ready for the next step", intro: "This frontend preview is not connected to an LLM or a RAG service. It cannot generate an evidence-based answer to this question.", sections: [{ title: "Explore the preview", text: "Open a sample conversation to inspect citations, or continue typing to preview multiple turns. Check the ticket page for live booking information." }], sources: [] };
}

/**
 * 建立演示会话的初始数据。
 */
export function initialConversations(): Conversation[] {
  return [
    { id: "sample-lanes", title: "三坊七巷的历史与游览", turns: [{ id: "lanes-1", question: "三坊七巷有什么文化特色？第一次去应该怎么看？", answer: sampleAnswer("lanes", "zh") }] },
    { id: "sample-tea", title: "福州茉莉花茶与地方生活", turns: [{ id: "tea-1", question: "如何从茉莉花茶了解福州文化？", answer: sampleAnswer("tea", "zh") }] },
  ];
}
