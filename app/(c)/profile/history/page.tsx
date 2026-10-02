"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";

type Session = {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
};
type Message = { role: string; content: string; createdAt: string };

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
                      messages.map((message, index) => (
                        <div
                          className={`chat-bubble ${message.role === "user" ? "user" : "assistant"}`}
                          key={index}
                        >
                          <span className="chat-role">
                            {message.role === "user" ? "我" : "AI"}
                          </span>
                          <p>{message.content}</p>
                        </div>
                      ))
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
