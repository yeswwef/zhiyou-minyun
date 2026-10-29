/**
 * @module-note app/(c)/profile/history/page.tsx
 * 游客端／用户中心／问答历史页面。客户端组件负责状态与交互，数据经接口获取；不要在此放服务端密钥。
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { AnswerContent } from "@/features/ai-chat/AnswerContent";

type Session = {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
};
type Message = { role: string; content: string; createdAt: string };

/** 数据库里 AI 回复存的是结构化 JSON，历史页只取正文，丢掉标题与说明。 */
type StoredAnswer = {
  intro?: string;
  sections?: { title?: string; text?: string }[];
};

function parseAnswer(content: string): StoredAnswer | null {
  if (!content.trim().startsWith("{")) return null;
  try {
    const data = JSON.parse(content) as StoredAnswer;
    if (data && typeof data === "object" && (typeof data.intro === "string" || Array.isArray(data.sections))) return data;
  } catch { /* 旧记录或纯文本回复按原文展示 */ }
  return null;
}

/** 只渲染问答正文，不展示“根据本地知识库回答”“资料说明 1”等包装信息。 */
function StoredAnswerView({ data }: { data: StoredAnswer }) {
  const sections = Array.isArray(data.sections) ? data.sections : [];
  const body = sections
    .map((section) => (typeof section.text === "string" ? section.text.trim() : ""))
    .filter(Boolean)
    .join("\n\n");
  const text = body || (typeof data.intro === "string" ? data.intro.trim() : "");
  if (!text) return null;
  return <AnswerContent text={text} className="chat-answer-text" />;
}

/**
 * 渲染游客端／用户中心／问答历史界面及其子组件。
 * 接口协作：/api/chat/sessions、/api/chat/sessions/${id}。
 */
export default function HistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    fetch("/api/chat/sessions")
      .then((response) => response.json())
      .then((payload: { data?: Session[]; loggedIn?: boolean }) => {
        setSessions(payload.data ?? []);
        setLoggedIn(!!payload.loggedIn);
      })
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  /**
   * 读取选中的历史会话并展示问答记录。
   * 接口协作：/api/chat/sessions/${id}。
   * 输入：id；类型与可选项见函数签名。
   */
  async function openSession(id: string) {
    if (openId === id) {
      setOpenId(null);
      setMessages([]);
      return;
    }
    setOpenId(id);
    setLoadingMessages(true);
    const response = await fetch(`/api/chat/sessions/${id}`);
    const payload = (await response.json()) as {
      session?: { messages: Message[] };
    };
    setMessages(payload.session?.messages ?? []);
    setLoadingMessages(false);
  }

  return (
    <>
      <div className="profile-page-head">
        <h1>问答历史</h1>
        <p>回顾你与 AI 的每一次交流。</p>
      </div>

      <div className="profile-page-body">
        {loading ? (
          <div className="profile-empty">正在加载……</div>
        ) : !loggedIn ? (
          <div className="profile-empty">
            请先 <Link href="/login">登录</Link> 后查看问答历史。
          </div>
        ) : sessions.length ? (
          <div className="chat-session-list">
            {sessions.map((session) => (
              <div className="chat-session" key={session.id}>
                <button
                  className="chat-session-head"
                  onClick={() => openSession(session.id)}
                >
                  <span className="chat-session-icon">
                    <MessageCircle size={16} />
                  </span>
                  <span className="chat-session-title">{session.title}</span>
                  <span className="chat-session-meta">
                    {session.messageCount} 条 ·{" "}
                    {new Date(session.updatedAt).toLocaleString("zh-CN")}
                  </span>
                </button>

                {openId === session.id && (
                  <div className="chat-session-body">
                    {loadingMessages ? (
                      <div className="profile-empty">加载中……</div>
                    ) : messages.length ? (
                      messages.map((message, index) => {
                        const parsed = message.role === "assistant" ? parseAnswer(message.content) : null;
                        return (
                          <div
                            className={`chat-bubble ${message.role === "user" ? "user" : "assistant"}`}
                            key={index}
                          >
                            <span className="chat-role">
                              {message.role === "user" ? "我" : "AI"}
                            </span>
                            {parsed ? (
                              <StoredAnswerView data={parsed} />
                            ) : (
                              <p>{message.content}</p>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="profile-empty">暂无记录</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="profile-empty">还没有问答记录，去首页问问 AI 吧。</div>
        )}
      </div>
    </>
  );
}
