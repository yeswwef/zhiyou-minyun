/**
 * @module-note features/ai-chat/AskExperience.tsx
 * 问答展示层：负责用户交互和回答排版；检索及模型调用由服务端接口承担。
 */
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronRight, Copy, FileText, Globe2, Home, Info, LoaderCircle, Map, MessageCircle, Plus, Send, ThumbsDown, ThumbsUp, Ticket, UserRound, X } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import type { Conversation, Language, Turn } from "./types";
import type { RagAnswer } from "@/features/rag/types";
import s from "./ask.module.css";
import { answerParagraph, retrievalSummary } from "./presentation";
import { WebSources } from "./WebSources";
import { AnswerContent } from "./AnswerContent";
import { readSse } from "@/features/rag/stream";

/**
 * 管理整个问答交互，包括会话切换、发送问题、流式事件、来源定位和反馈。
 * 接口协作：/api/chat/sessions、/api/chat/sessions/${encodeURIComponent(item.sessionId)}、/api/chat/answer、/api/chat/feedback。
 */
export function AskExperience({ initialQuestion }: { initialQuestion: string }) {
  const [conversations, setConversations] = useState<Conversation[]>([{ id: "new", title: "新对话", turns: [] }]);
  const [activeId, setActiveId] = useState("new");
  const [language, setLanguage] = useState<Language>("zh");
  const [draft, setDraft] = useState(initialQuestion);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{ question: string; startedAt: number } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [streamText, setStreamText] = useState("");
  const [streamStatus, setStreamStatus] = useState("");
  const [firstTextSeconds, setFirstTextSeconds] = useState<number | null>(null);
  const pendingCard = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);
  const [selection, setSelection] = useState<{ turnId: string; sourceId: string }>({ turnId: "lanes-1", sourceId: "1" });
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const zh = language === "zh";
  /**
   * 根据当前语言返回对应文案。
   * 输入：cn、en；类型与可选项见函数签名。
   */
  const t = (cn: string, en: string) => zh ? cn : en;
  const active = conversations.find((item) => item.id === activeId)!;
  const sourceTurn = active.turns.find((turn) => turn.id === selection.turnId) ?? active.turns.at(-1);
  const sources = sourceTurn?.answer.sources ?? [];
  const selected = sources.find((source) => source.id === selection.sourceId) ?? sources[0];

  useEffect(() => {
    if (!pending) return;
    /**
     * 更新等待回答时的已用时间。
     */
    const tick = () => setElapsed((performance.now() - pending.startedAt) / 1000);
    tick();
    const timer = window.setInterval(tick, 100);
    pendingCard.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    return () => window.clearInterval(timer);
  }, [pending]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/chat/sessions", { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error("history");
      const data = await response.json();
      if (!Array.isArray(data.data)) return;
      const saved: Conversation[] = data.data.map((item: { id: string; title: string }) => ({ id: item.id, sessionId: item.id, title: item.title, turns: [] }));
      setConversations((items) => [...items, ...saved.filter((s) => !items.some((i) => i.id === s.id || i.sessionId === s.id))]);
    }).catch(() => { if (!controller.signal.aborted) setNotice("历史记录暂不可用，可继续新对话。"); });
    return () => controller.abort();
  }, []);

  /**
   * 加载并切换选中的历史会话。
   * 接口协作：/api/chat/sessions/${encodeURIComponent(item.sessionId)}。
   * 输入：id；类型与可选项见函数签名。
   */
  async function switchConversation(id: string) {
    if (inFlight.current) return;
    setActiveId(id); setSelection({ turnId: "", sourceId: "1" }); setNotice(""); setDraft("");
    const item = conversations.find((c) => c.id === id);
    if (!item?.sessionId || item.turns.length) return;
    inFlight.current = true; setBusy(true);
    try {
      const response = await fetch(`/api/chat/sessions/${encodeURIComponent(item.sessionId)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "无法读取会话");
      const turns: Turn[] = [];
      let question = "";
      for (const message of data.session.messages) {
        if (message.role === "user") question = message.content;
        if (message.role !== "assistant") continue;
        try {
          const answer: RagAnswer = JSON.parse(message.content);
          if (!answer.mode || !Array.isArray(answer.sections) || !Array.isArray(answer.sources) || !answer.trace) continue;
          turns.push({ id: crypto.randomUUID(), question, answer, requestId: message.citations?.requestId });
        } catch { /* Legacy plain-text messages do not use the RAG response schema. */ }
      }
      setConversations((items) => items.map((c) => c.id === id ? { ...c, turns } : c));
      if (!turns.length) setNotice("此会话没有可展示的新版 RAG 回答，可继续提问。");
    } catch (error) { setNotice(error instanceof Error ? error.message : "历史读取失败"); }
    finally { inFlight.current = false; setBusy(false); }
  }
  /**
   * 建立空白对话并重置输入和来源选择。
   */
  function newConversation() {
    if (inFlight.current) return;
    const id = crypto.randomUUID();
    setConversations((items) => [{ id, title: t("新对话", "New conversation"), turns: [] }, ...items]);
    switchConversation(id); input.current?.focus();
  }
  /**
   * 发送当前问题或数据事件并处理接收结果。
   * 接口协作：/api/chat/answer。
   * 输入：question；类型与可选项见函数签名。
   */
  async function send(question = draft) {
    const text = question.trim().slice(0, 1000);
    if (!text || inFlight.current) return;
    // Event-handler timestamp, never executed during rendering.
    // eslint-disable-next-line react-hooks/purity
    const startedAt = performance.now();
    inFlight.current = true; setBusy(true); setElapsed(0); setPending({ question: text, startedAt }); setNotice("");
    setStreamText(""); setStreamStatus("正在准备回答…");
    setFirstTextSeconds(null);
    let firstReceived = false;
    try {
      const response = await fetch("/api/chat/answer", { method: "POST", headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ question: text, language, sessionId: active.sessionId }), signal: AbortSignal.timeout(180000) });
      if (!response.ok) { const error = await response.json(); throw new Error(error.error || "问答请求失败"); }
      let data: { answer: RagAnswer; requestId: string; sessionId?: string; persisted: boolean } | undefined;
      if (response.headers.get("content-type")?.includes("text/event-stream")) {
        if (!response.body) throw new Error("流式响应为空");
        await readSse(response.body, raw => {
          const event = JSON.parse(raw);
          if ((event.type === "delta" || event.type === "replace") && event.text?.trim() && !firstReceived) {
            firstReceived = true; setFirstTextSeconds((performance.now() - startedAt) / 1000);
          }
          if (event.type === "status") setStreamStatus(event.text);
          else if (event.type === "delta") setStreamText(previous => previous + event.text);
          else if (event.type === "replace") setStreamText(event.text);
          else if (event.type === "done") data = event;
          else if (event.type === "error") throw new Error(event.text);
        });
      } else data = await response.json();
      if (!data) throw new Error("回答连接中断，请重新发送问题");
      const completed = data;
      // Request-completion timestamp, not a render-time calculation.
      // eslint-disable-next-line react-hooks/purity
      const turn: Turn = { id: crypto.randomUUID(), question: text, answer: data.answer, requestId: data.requestId, durationMs: performance.now() - startedAt };
      setConversations((items) => items.map((item) => item.id === activeId ? { ...item, sessionId: completed.sessionId || item.sessionId,
        title: item.turns.length ? item.title : text, turns: [...item.turns, turn] } : item));
      setDraft(""); setSelection({ turnId: turn.id, sourceId: "1" });
      setNotice(data.persisted ? t("回答已保存至个人历史。", "Saved to your history.") : t("当前回答未保存到账号；刷新后不保留，也不支持跨轮上下文。", "Not saved; refresh clears this conversation. Follow-up context is unavailable."));
      requestAnimationFrame(() => window.document.getElementById(turn.id)?.scrollIntoView({ behavior: "smooth", block: "center" }));
    } catch (error) { setNotice(error instanceof Error ? error.message : "请求失败，请重试。"); }
    finally { inFlight.current = false; setBusy(false); setPending(null); }
  }
  /**
   * 为当前回答提交点赞或点踩反馈。
   * 接口协作：/api/chat/feedback。
   * 输入：turn、rating；类型与可选项见函数签名。
   */
  async function rate(turn: Turn, rating: "up" | "down") {
    if (!active.sessionId || !turn.requestId) { setNotice("登录并保存会话后才能提交反馈。"); return; }
    try {
      const response = await fetch("/api/chat/feedback", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: active.sessionId, requestId: turn.requestId, rating }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "反馈失败");
      setFeedback((values) => ({ ...values, [turn.id]: rating })); setNotice("反馈已保存，谢谢。");
    } catch (error) { setNotice(error instanceof Error ? error.message : "反馈保存失败"); }
  }
  /**
   * 按需打开该回答的来源弹窗，不占用对话区宽度。
   * 输入：turnId、sourceId；类型与可选项见函数签名。
   */
  function showSource(turnId: string, sourceId: string) {
    setSelection({ turnId, sourceId });
    dialog.current?.showModal();
  }
  /**
   * 将回答文字复制到系统剪贴板。
   * 输入：text；类型与可选项见函数签名。
   */
  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); setNotice(t("已复制回答", "Answer copied")); }
    catch { setNotice(t("无法访问剪贴板，请选择回答文字手动复制。", "Clipboard unavailable. Please select and copy the text.")); }
  }

  return <div className={s.shell} lang={zh ? "zh-CN" : "en"}>
    <header className={s.header}>
      <Link href="/home" className={s.brand}><span className={s.brandIcon}><BrandMark size={29} /></span><span><strong>智游闽韵</strong><small>FUZHOU TRAVEL</small></span></Link>
      <nav aria-label={t("主导航", "Main navigation")}><Link href="/home">{t("发现", "Discover")}</Link><Link href="/community">{t("游记", "Stories")}</Link><Link href="/shop">{t("商城", "Shop")}</Link></nav>
      <div className={s.headerActions}><Globe2 size={16}/><button aria-pressed={zh} onClick={() => setLanguage("zh")}>中文</button><span>/</span><button aria-pressed={!zh} onClick={() => setLanguage("en")}>EN</button><Link href="/profile" aria-label={t("用户中心", "Profile")} className={s.avatar}><UserRound size={19}/></Link></div>
    </header>
    <aside className={s.sidebar} aria-label={t("功能与历史", "Navigation and history")}>
      <nav><Link href="/home"><Home size={19}/>{t("首页", "Home")}</Link><Link href="/profile"><UserRound size={19}/>{t("用户中心", "Profile")}</Link><Link href="/ask" className={s.activeNav} aria-current="page"><MessageCircle size={19}/>{t("AI 文化问答", "Cultural assistant")}</Link><Link href="/resources"><Map size={19}/>{t("文旅资源中心", "Explore Fuzhou")}</Link><Link href="/tickets"><Ticket size={19}/>{t("票务预约", "Tickets")}</Link></nav>
      <button className={s.newChat} onClick={newConversation}><Plus size={18}/>{t("新建对话", "New conversation")}</button>
      <div className={s.historyHeading}><span>{t("问答历史", "Conversations")}</span><small>{String(conversations.length).padStart(2, "0")}</small></div>
      <p className={s.historyHint}>{t("登录后保存 · 游客仅当前页面", "Saved when signed in · guests: this page only")}</p>
      <div className={s.history}>{conversations.map((item) => <button key={item.id} onClick={() => switchConversation(item.id)} aria-pressed={activeId === item.id} title={item.title}><MessageCircle size={14}/><span>{item.title}</span><ChevronRight size={13}/></button>)}</div>
      <div className={s.sidebarFoot}><span>有福之州</span><small>{t("山海相拥 · 文脉绵长", "A city of living stories")}</small></div>
    </aside>
    <main className={s.main}>
      <div className={s.heading}><p>{t("首页 / 智游闽韵小助手", "Home / Zhiyou Minyun Assistant")}</p><div><h1>{t("智游闽韵小助手", "Zhiyou Minyun Assistant")}</h1></div><p>{t("每一次探索，都有据可循。", "Every discovery begins with a story.")}</p></div>
      <div className={s.previewNote}><Info size={15}/>{t("回答仅供参考，具体情况还以实际为主", "Answers are for reference only. Actual conditions take precedence.")}</div>
      <div className={s.columns}>
        <section className={s.conversation} aria-label={t("问答内容", "Conversation")}>
          {!active.turns.length && <div className={s.empty}><span className={s.assistantIcon}><BrandMark size={30}/></span><p className={s.eyebrow}>EXPLORE THE STORIES</p><h2>{t("想从哪里开始认识福州？", "What would you like to discover?")}</h2><p>{t("问一段历史，寻一门手艺，发现一座城。", "Explore its history, crafts and everyday life.")}</p><button disabled={busy} onClick={() => send("三坊七巷的三坊是哪三坊？")}>{t("问问三坊七巷", "Ask about Sanfang Qixiang")} <ArrowUpRight size={16}/></button></div>}
          {active.turns.map((turn) => <div key={turn.id} id={turn.id} className={s.turn}>
            <div className={s.question}><p>{turn.question}</p><span className={s.avatar}><UserRound size={17}/></span></div>
            <article className={s.answer}>
              <header><span className={s.assistantIcon}><BrandMark size={22}/></span><b>{t("智游助手", "Zhiyou assistant")}</b><span className={s.sampleBadge}>{turn.answer.mode}</span></header>
              <p className={s.timing}>{t("回答用时", "Response time")} {((turn.durationMs ?? turn.answer.trace.elapsedMs) / 1000).toFixed(1)} {t("秒", "s")}{turn.answer.trace.firstTextMs !== undefined && <> · {t("首次正文", "First text")} {(turn.answer.trace.firstTextMs / 1000).toFixed(1)} {t("秒", "s")}</>}</p>
              {turn.answer.mode === "extractive" && <p className={s.warning}>{t("模型暂不可用，以下为本地资料摘录。", "Model unavailable; showing a local excerpt.")}</p>}
              {turn.answer.mode === "model" && <p className={s.timing}>{t("模型回答 · 未经本地资料核验", "Model answer · not verified against local documents")}</p>}
              {(retrievalSummary(turn.answer).searched || turn.answer.sources.length > 0) && <div className={s.retrievalSummary}>
                <details><summary>{t(`检索 ${retrievalSummary(turn.answer).queries.length} 个查询`, `${retrievalSummary(turn.answer).queries.length} search queries`)}</summary>
                  {retrievalSummary(turn.answer).queries.map(query => <p key={query}>{query}</p>)}
                </details>
                <span>·</span><button disabled={!turn.answer.sources.length} onClick={() => showSource(turn.id, turn.answer.sources[0]?.id ?? "1")}>
                  {t(`参考 ${retrievalSummary(turn.answer).documents} 篇资料`, `${retrievalSummary(turn.answer).documents} reference documents`)}<ChevronRight size={14}/>
                </button>
              </div>}
              {!!turn.answer.webSources?.length && <div className={s.retrievalSummary}><button onClick={() => showSource(turn.id, "1")}>{t(`联网参考 ${turn.answer.webSources.length} 个网页`, `${turn.answer.webSources.length} web references`)}<ChevronRight size={14}/></button></div>}
              <AnswerContent className={s.answerParagraph} text={answerParagraph(turn.answer)} />
              {!!turn.answer.trace.warnings.length && <details className={s.diagnostics}><summary>{t("回答说明", "Response details")}</summary>{turn.answer.trace.warnings.map((warning) => <p key={warning}>{warning}</p>)}</details>}
              <footer><button onClick={() => copy(answerParagraph(turn.answer))}><Copy size={15}/>{t("复制", "Copy")}</button><button aria-pressed={feedback[turn.id] === "up"} onClick={() => rate(turn, "up")}><ThumbsUp size={15}/>{t("有帮助", "Helpful")}</button><button aria-pressed={feedback[turn.id] === "down"} onClick={() => rate(turn, "down")}><ThumbsDown size={15}/>{t("需改进", "Improve")}</button>{turn.answer.sources.length > 0 && <button className={s.sourceAction} onClick={() => showSource(turn.id, "1")}><FileText size={15}/>{t(`查看 ${turn.answer.sources.length} 条来源`, `View ${turn.answer.sources.length} sources`)}<ChevronRight size={14}/></button>}</footer>
            </article>
            {!!turn.answer.followUpQuestions?.length && <div className={s.followUps} aria-label={t("推荐追问", "Suggested follow-ups")}>
              {turn.answer.followUpQuestions.map(question => <button key={question} disabled={busy} onClick={() => send(question)}>{question}<ChevronRight size={16}/></button>)}
            </div>}
          </div>)}
          {pending && <div ref={pendingCard} className={s.turn}>
            <div className={s.question}><p>{pending.question}</p><span className={s.avatar}><UserRound size={17}/></span></div>
            <article className={`${s.answer} ${s.thinkingCard}`} aria-busy="true">
              <header><span className={s.assistantIcon}><BrandMark size={22}/></span><b>{t("智游助手", "Zhiyou assistant")}</b></header>
              <div className={s.thinking}><LoaderCircle className={s.spinner} size={18}/><span role="status">{streamStatus || t("正在思考", "Thinking")}</span><span className={s.timer} role="timer" aria-live="off">{elapsed.toFixed(1)} {t("秒", "s")}</span></div>
              {streamText && <AnswerContent className={s.answerParagraph} text={streamText} />}
              {firstTextSeconds !== null && <p className={s.timing}>{t("首次正文", "First text")} {firstTextSeconds.toFixed(1)} {t("秒", "s")}</p>}
              <p className={s.thinkingHint}>{t("正在准备回答，请稍候。这里显示的是请求等待时间。", "Preparing your answer. The timer shows request waiting time.")}</p>
            </article>
          </div>}
          <div className={s.suggestions}><button onClick={() => { setDraft(t("三山两塔指什么？", "What are the three hills and two pagodas?")); input.current?.focus(); }}>{t("三山两塔指什么？", "Three hills and two pagodas?")}</button><button onClick={() => { setDraft(t("只有半天，怎样安排不赶路？", "How should I plan a relaxed half-day visit?")); input.current?.focus(); }}>{t("半日游怎么安排？", "Plan a half-day visit")}</button></div>
          <form className={s.composer} onSubmit={(event) => { event.preventDefault(); send(); }}><label className={s.srOnly} htmlFor="ask-question">{t("继续提问", "Ask a question")}</label><textarea id="ask-question" ref={input} rows={2} maxLength={1000} value={draft} disabled={busy} onChange={(event) => setDraft(event.target.value)} placeholder={t("继续追问，探索更多福州故事…", "Ask a follow-up about Fuzhou…")} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send(); } }}/><div><small>{t("Enter 发送 · Shift + Enter 换行", "Enter to send · Shift + Enter for a new line")} · {draft.length}/1000</small><button type="submit" disabled={busy || !draft.trim()}><Send size={17}/>{busy ? t("处理中…", "Working…") : t("发送", "Send")}</button></div></form>
          <p className={s.notice} role="status">{notice || t("请勿在问题中提交身份证号等敏感信息。", "Do not include identity numbers or other sensitive information.")}</p>
        </section>
      </div>
    </main>
    <dialog ref={dialog} aria-label={t("原文预览", "Source preview")} className={s.dialog} onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <button className={s.close} aria-label={t("关闭原文", "Close document")} onClick={() => dialog.current?.close()}><X size={22}/></button>
      <h2>{t("引用来源", "Sources")}</h2>
      {!!sourceTurn?.answer.webSources?.length && <WebSources sources={sourceTurn.answer.webSources} english={language === "en"}/>}
      {sources.map(source => <button key={source.id} className={s.sourceCard} aria-pressed={selected?.id === source.id} onClick={() => setSelection({ turnId: sourceTurn!.id, sourceId: source.id })}><span><b>[{source.id}] {source.title}</b><small>{source.file} · L{source.lineStart}–{source.lineEnd}</small></span></button>)}
      {selected && <><h3>{selected.title}</h3><blockquote style={{ whiteSpace: "pre-wrap" }}>{selected.quote}</blockquote><p>{selected.file} · L{selected.lineStart}–{selected.lineEnd}</p></>}
      {!!sources.length && <div className={s.previewNote}><Info size={16}/>{t("此片段来自回答时的本地文档索引版本；文件修改后请重新导入。它不是外部官网核验结果。", "Excerpt from the indexed document version used for this answer. Re-import edited files. This is not external official verification.")}</div>}
    </dialog>
  </div>;
}
