/**
 * @module-note app/admin/ai/page.tsx
 * 平台管理中心：AI 问答运营观察（只读）。
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3, MessageSquareText, Sparkles, UserRound } from "lucide-react";

type Session = {
  id: string;
  title: string;
  updatedAt: string;
  user: { username: string; nickname: string | null } | null;
  messages: { role: string; content: string; createdAt: string; latencyMs: number | null }[];
  _count: { messages: number };
};
type Question = {
  id: string;
  content: string;
  createdAt: string;
  session: { user: { username: string; nickname: string | null } | null };
};
type Mode = { mode: string; label: string; count: number };
type Stats = { sessions: number; messages: number; avgLatency: number; samples: number };

/** 把结构化回答还原为一句可读预览。 */
function preview(content: string) {
  const text = content.trim();
  if (!text.startsWith("{")) return text;
  try {
    const data = JSON.parse(text) as { intro?: unknown; sections?: { text?: unknown }[] };
    const body = Array.isArray(data.sections)
      ? data.sections.map((section) => (typeof section.text === "string" ? section.text : "")).join(" ")
      : "";
    return (body || (typeof data.intro === "string" ? data.intro : "")).slice(0, 90) || "（结构化回答）";
  } catch {
    return text.slice(0, 90);
  }
}

export default function AdminAiPage() {
  const [stats, setStats] = useState<Stats>({ sessions: 0, messages: 0, avgLatency: 0, samples: 0 });
  const [modes, setModes] = useState<Mode[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/ai", { signal: controller.signal })
      .then((response) => response.json())
      .then((payload) => {
        setStats(payload.stats ?? { sessions: 0, messages: 0, avgLatency: 0, samples: 0 });
        setModes(payload.modes ?? []);
        setSessions(payload.sessions ?? []);
        setQuestions(payload.questions ?? []);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const modeTotal = useMemo(() => modes.reduce((sum, item) => sum + item.count, 0), [modes]);

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div><p>AI OPERATIONS</p><h1>AI 运营</h1><span>观察问答规模、回答模式与响应耗时，为知识库补编与模型调优提供依据。</span></div>
        <div className="admin-date"><Sparkles size={16}/>只读视图</div>
      </div>

      <div className="admin-mini-grid mb-5">
        <div className="admin-mini"><span>问答会话</span><b>{stats.sessions}<small>次</small></b></div>
        <div className="admin-mini"><span>消息总量</span><b>{stats.messages}<small>条</small></b></div>
        <div className="admin-mini"><span>平均响应</span><b>{stats.avgLatency >= 1000 ? (stats.avgLatency / 1000).toFixed(1) : stats.avgLatency}<small>{stats.avgLatency >= 1000 ? "s" : "ms"}</small></b></div>
        <div className="admin-mini"><span>模式样本</span><b>{stats.samples}<small>条</small></b></div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <section className="admin-panel overflow-hidden p-0">
          <div className="admin-panel-heading px-5 pt-5"><div><p>RECENT SESSIONS</p><h2>最近问答会话</h2></div></div>
          <div className="overflow-x-auto">
            <table className="admin-booking-table min-w-[720px]">
              <thead><tr><th>会话 / 用户</th><th>最近内容</th><th style={{ width: 150 }}>更新时间</th></tr></thead>
              <tbody>
                {sessions.map((session) => {
                  const last = session.messages[session.messages.length - 1];
                  return (
                    <tr key={session.id}>
                      <td>
                        <b>{session.title.slice(0, 32)}{session.title.length > 32 ? "…" : ""}</b>
                        <small>{session.user ? (session.user.nickname || session.user.username) : "匿名 / 已删除"} · {session._count.messages} 条消息</small>
                      </td>
                      <td><small className="line-clamp-2">{last ? preview(last.content) : "暂无消息"}</small></td>
                      <td>{new Date(session.updatedAt).toLocaleString("zh-CN")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!sessions.length && <p className="admin-empty">暂无问答会话</p>}
          </div>
        </section>

        <div className="grid content-start gap-5">
          <section className="admin-panel">
            <div className="admin-panel-heading"><div><p>ANSWER MODE</p><h2>回答模式构成</h2></div></div>
            {modes.map((mode) => (
              <div className="admin-mode-row" key={mode.mode}>
                <span>{mode.label}</span>
                <div className="admin-mode-track"><div className="admin-mode-fill" style={{ width: `${modeTotal ? Math.max(4, Math.round((mode.count / modeTotal) * 100)) : 0}%` }}/></div>
                <b className="text-right text-[11px] text-[#5f5953]">{mode.count}</b>
              </div>
            ))}
            {!modes.length && <p className="py-8 text-center text-[11px] text-[#9a9289]">暂无可统计的结构化回答</p>}
            <p className="mt-3 text-[9.5px] leading-relaxed text-[#a49a90]">本地知识库与联网回答均带来源；拒答表示系统主动收紧了信息边界。</p>
          </section>

          <section className="admin-panel">
            <div className="admin-panel-heading"><div><p>RECENT QUESTIONS</p><h2>最近提问</h2></div></div>
            <div className="grid gap-3">
              {questions.map((question) => (
                <div key={question.id} className="border-b border-[#f0e8de] pb-2 last:border-0">
                  <p className="m-0 line-clamp-2 text-[11px] text-[#4f4a45]">{question.content}</p>
                  <small className="mt-1 flex items-center gap-1 text-[9.5px] text-[#a49a90]">
                    <UserRound size={10}/>{question.session.user ? (question.session.user.nickname || question.session.user.username) : "匿名"}
                    <Clock3 size={10} className="ml-2"/>{new Date(question.createdAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </small>
                </div>
              ))}
              {!questions.length && <p className="py-6 text-center text-[11px] text-[#9a9289]">暂无提问记录</p>}
            </div>
          </section>
        </div>
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-[10px] text-[#9a9289]"><MessageSquareText size={12}/>本页只读：AI 内容治理通过知识库编选与提示词迭代完成，不在后台直接改写用户会话。</p>
    </div>
  );
}
