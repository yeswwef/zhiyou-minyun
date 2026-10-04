"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/BrandMark";

type Mode = "login" | "register";

function safeNextPath() {
  if (typeof window === "undefined") return "/profile";
  const candidate = new URLSearchParams(window.location.search).get("next");
  return candidate?.startsWith("/") && !candidate.startsWith("//")
    ? candidate
    : "/profile";
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((payload: { user: unknown }) => {
        if (payload.user) router.replace(safeNextPath());
      })
      .catch(() => {});
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const body =
      mode === "login"
        ? { username, password }
        : { username, password, nickname: nickname || null };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as { error?: string };
    setBusy(false);

    if (response.ok) {
      router.replace(safeNextPath());
      router.refresh();
    } else {
      setError(payload.error ?? "操作失败，请重试");
    }
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <Link href="/home" className="login-brand">
          <span><BrandMark size={22} /></span>
          <strong>智游闽韵</strong>
        </Link>

        <div className="login-tabs">
          <button
            className={mode === "login" ? "active" : ""}
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            登录
          </button>
          <button
            className={mode === "register" ? "active" : ""}
            onClick={() => {
              setMode("register");
              setError("");
            }}
          >
            注册
          </button>
        </div>

        <form onSubmit={submit} className="login-form">
          <label>
            <span>用户名</span>
            <input
              className="input"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="请输入用户名"
              autoComplete="username"
            />
          </label>

          {mode === "register" && (
            <label>
              <span>昵称（可选）</span>
              <input
                className="input"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                placeholder="给自己起个好听的名字"
              />
            </label>
          )}

          <label>
            <span>密码</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={mode === "register" ? "至少 6 位" : "请输入密码"}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>

          {error && <p className="login-error">{error}</p>}

          <button
            className="btn login-submit"
            type="submit"
            disabled={busy || !username.trim() || !password}
          >
            {busy ? "处理中……" : mode === "login" ? "登录" : "注册并登录"}
          </button>
        </form>

        <p className="login-back">
          <Link href="/home">返回首页</Link>
        </p>
      </div>
    </main>
  );
}
