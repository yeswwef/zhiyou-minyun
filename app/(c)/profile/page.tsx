"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  KeyRound,
  Pencil,
  ShieldCheck,
  UserRound,
} from "lucide-react";

type SummaryUser = {
  username: string;
  nickname: string | null;
  role: string;
  createdAt: string;
};
type Summary = {
  user: SummaryUser | null;
  loggedIn: boolean;
  counts: {
    favorites: number;
    trips: number;
    views: number;
    chatSessions: number;
    following: number;
    followers: number;
  };
};

const STAT_ITEMS = [
  { key: "favorites", label: "收藏" },
  { key: "trips", label: "行程" },
  { key: "views", label: "足迹" },
  { key: "chatSessions", label: "问答" },
  { key: "following", label: "关注" },
  { key: "followers", label: "粉丝" },
] as const;

export default function ProfilePage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [checked, setChecked] = useState(false);
  const [editing, setEditing] = useState(false);

  const [nickname, setNickname] = useState("");
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/profile/summary")
      .then((response) => response.json())
      .then((payload: Summary) => {
        setSummary(payload);
        setNickname(payload.user?.nickname ?? "");
      })
      .catch(() => setSummary(null))
      .finally(() => setChecked(true));
  }, []);

  function resetFeedback() {
    setMessage("");
    setError("");
  }

  async function saveNickname(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetFeedback();
    setBusy(true);
    const response = await fetch("/api/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname }),
    });
    setBusy(false);
    if (response.ok) {
      setSummary((prev) =>
        prev && prev.user
          ? { ...prev, user: { ...prev.user, nickname: nickname || null } }
          : prev,
      );
      setMessage("昵称已更新");
    } else {
      setError("更新失败，请重试");
    }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetFeedback();
    if (newPwd !== confirmPwd) {
      setError("两次输入的新密码不一致");
      return;
    }
    setBusy(true);
    const response = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
    });
    const payload = (await response.json()) as { error?: string };
    setBusy(false);
    if (response.ok) {
      setMessage("密码修改成功");
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } else {
      setError(payload.error ?? "修改失败");
    }
  }

  if (!checked) {
    return <div className="uc-empty">加载中……</div>;
  }

  if (!summary?.user) {
    return (
      <div className="uc-guest">
        <UserRound size={40} />
        <p>登录后即可查看个人信息、收藏与问答记录。</p>
        <Link className="btn" href="/login">
          登录 / 注册
        </Link>
      </div>
    );
  }

  const user = summary.user;

  return (
    <>
      <section className="uc-profile-card">
        <div className="uc-profile-main">
          <span className="uc-avatar">
            {user.nickname?.[0] || user.username[0]}
          </span>
          <div className="uc-profile-info">
            <div className="uc-name-row">
              <h2>{user.nickname || user.username}</h2>
              <span className="uc-level">
                {user.role === "B" ? "商户" : "游客"}
              </span>
            </div>
            <div className="uc-info-grid">
              <span>
                <UserRound size={14} /> 用户名：{user.username}
              </span>
              <span>
                <ShieldCheck size={14} /> 身份：
                {user.role === "B" ? "商户 / 传承人" : "普通游客"}
              </span>
              <span>
                <Pencil size={14} /> 昵称：{user.nickname || "未设置"}
              </span>
              <span>
                <BadgeCheck size={14} /> 注册于{" "}
                {new Date(user.createdAt).toLocaleDateString("zh-CN")}
              </span>
            </div>
          </div>
        </div>
        <div className="uc-profile-cert">
          <BadgeCheck size={56} />
          <small>智游闽韵认证用户</small>
        </div>
      </section>

      <section className="uc-stats">
        {STAT_ITEMS.map((item) => (
          <div className="uc-stat" key={item.key}>
            <b>{summary.counts[item.key]}</b>
            <small>{item.label}</small>
          </div>
        ))}
      </section>

      <section className="uc-card">
        <div className="uc-card-head">
          <h2>
            安全设置 <ArrowRight size={16} />
          </h2>
          <button
            className="uc-card-action"
            onClick={() => {
              resetFeedback();
              setEditing((value) => !value);
            }}
          >
            <Pencil size={14} /> {editing ? "收起" : "修改信息"}
          </button>
        </div>

        <div className="uc-rows">
          <div className="uc-row">
            <KeyRound size={18} />
            <span className="uc-row-label">账号密码</span>
            <span className="uc-row-value">••••••••</span>
          </div>

          {editing && (
            <form className="uc-inline-form" onSubmit={savePassword}>
              <label>
                <span>当前密码</span>
                <input
                  className="input"
                  type="password"
                  value={currentPwd}
                  onChange={(event) => setCurrentPwd(event.target.value)}
                  autoComplete="current-password"
                />
              </label>
              <label>
                <span>新密码</span>
                <input
                  className="input"
                  type="password"
                  value={newPwd}
                  onChange={(event) => setNewPwd(event.target.value)}
                  placeholder="至少 6 位"
                  autoComplete="new-password"
                />
              </label>
              <label>
                <span>确认新密码</span>
                <input
                  className="input"
                  type="password"
                  value={confirmPwd}
                  onChange={(event) => setConfirmPwd(event.target.value)}
                  autoComplete="new-password"
                />
              </label>
              <button
                className="btn"
                type="submit"
                disabled={busy || !currentPwd || !newPwd || !confirmPwd}
              >
                {busy ? "提交中……" : "确认修改"}
              </button>
            </form>
          )}

          <div className="uc-row">
            <Pencil size={18} />
            <span className="uc-row-label">昵称</span>
            <span className="uc-row-value">{user.nickname || "暂未设置"}</span>
          </div>

          {editing && (
            <form className="uc-inline-form" onSubmit={saveNickname}>
              <label>
                <span>昵称</span>
                <input
                  className="input"
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  placeholder="设置昵称"
                />
              </label>
              <button className="btn" type="submit" disabled={busy}>
                {busy ? "保存中……" : "保存"}
              </button>
            </form>
          )}
        </div>

        {error && <p className="login-error uc-feedback">{error}</p>}
        {message && <p className="uc-success uc-feedback">{message}</p>}
      </section>
    </>
  );
}
