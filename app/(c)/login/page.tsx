"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/BrandMark";

type Mode = "login" | "register";
type Endpoint = "guest" | "merchant" | "admin";

/** 三端登录：选择身份，登录后进入对应端 */
const ENDPOINTS: Array<{ value: Endpoint; label: string; href: string }> = [
  { value: "guest", label: "游客端", href: "/home" },
  { value: "merchant", label: "商户端", href: "/b/dashboard" },
  { value: "admin", label: "管理员", href: "/admin/dashboard" },
];

/** 注册时可选择的身份 */
const REGISTER_ROLES: Array<{ value: "C" | "B"; label: string; hint: string }> = [
  { value: "C", label: "游客", hint: "逛资源 · 发游记 · 报名体验课" },
  { value: "B", label: "商户 / 传承人", hint: "上架商品 · 订单核销 · 数字工作室" },
];

/** 读取 ?next= 指定的回跳地址（仅允许站内路径） */
function nextPath() {
  if (typeof window === "undefined") return null;
  const candidate = new URLSearchParams(window.location.search).get("next");
  return candidate && candidate.startsWith("/") && !candidate.startsWith("//")
    ? candidate
    : null;
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [endpoint, setEndpoint] = useState<Endpoint>("guest");
  const [regRole, setRegRole] = useState<"C" | "B">("C");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [merchantName, setMerchantName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const targetHref = ENDPOINTS.find((item) => item.value === endpoint)!.href;

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("endpoint");
    const requestedEndpoint: Endpoint =
      requested === "admin" || requested === "merchant" ? requested : "guest";
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((payload: { user: { role: "C" | "B" | "ADMIN" } | null }) => {
        setEndpoint(requestedEndpoint);
        const expectedRole = requestedEndpoint === "admin" ? "ADMIN" : requestedEndpoint === "merchant" ? "B" : "C";
        if (payload.user?.role === expectedRole) {
          const endpointHome = ENDPOINTS.find((item) => item.value === requestedEndpoint)!.href;
          router.replace(nextPath() ?? endpointHome);
        } else if (payload.user) {
          setError("当前浏览器已登录其他身份，请输入对应端账号重新登录");
        }
      })
      .catch(() => {});
  }, [router]);

  function reset() {
    setUsername("");
    setPassword("");
    setNickname("");
    setMerchantName("");
    setError("");
    setEndpoint("guest");
    setRegRole("C");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);

    const isLogin = mode === "login";
    const response = await fetch(
      isLogin ? "/api/auth/login" : "/api/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isLogin
            ? { username, password, endpoint }
            : { username, password, nickname: nickname || null, role: regRole, merchantName },
        ),
      },
    );
    const payload = (await response.json()) as { error?: string };
    setBusy(false);

    if (response.ok) {
      const afterRegister = regRole === "B" ? "/b/dashboard" : "/home";
      router.replace(nextPath() ?? (isLogin ? targetHref : afterRegister));
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

          {mode === "register" && (
            <div className="login-roles" role="radiogroup" aria-label="注册身份">
              <span className="login-roles-label">注册身份</span>
              <div className="login-role-options">
                {REGISTER_ROLES.map((item) => (
                  <label className="login-role" key={item.value} title={item.hint}>
                    <input
                      type="radio"
                      name="register-role"
                      value={item.value}
                      checked={regRole === item.value}
                      onChange={() => setRegRole(item.value)}
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {mode === "register" && regRole === "B" && (
            <label>
              <span>店铺 / 工作室名称</span>
              <input
                className="input"
                value={merchantName}
                onChange={(event) => setMerchantName(event.target.value)}
                placeholder="如：福州三坊七巷文创店"
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

          {mode === "login" && (
            <div className="login-roles" role="radiogroup" aria-label="登录身份">
              <span className="login-roles-label">登录身份</span>
              <div className="login-role-options">
                {ENDPOINTS.map((item) => (
                  <label className="login-role" key={item.value}>
                    <input
                      type="radio"
                      name="login-endpoint"
                      value={item.value}
                      checked={endpoint === item.value}
                      onChange={() => setEndpoint(item.value)}
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {error && <p className="login-error">{error}</p>}

          <div className="login-actions">
            <button
              className="btn login-submit"
              type="submit"
              disabled={
                busy ||
                !username.trim() ||
                !password ||
                (mode === "register" && regRole === "B" && !merchantName.trim())
              }
            >
              {busy ? "处理中……" : mode === "login" ? "登录" : "注册并登录"}
            </button>
            {mode === "login" && (
              <button className="btn-ghost login-reset" type="button" onClick={reset}>
                重置
              </button>
            )}
          </div>
        </form>

        <p className="login-back">
          <Link href="/home">以访客身份浏览</Link>
        </p>
      </div>
    </main>
  );
}
