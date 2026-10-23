/**
 * @module-note components/ProfileTopbar.tsx
 * 共享界面组件：接收页面数据或处理局部交互，避免每个页面重复实现。
 */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, UserRound } from "lucide-react";
import { Emblem } from "./Emblem";

type UserInfo = { username: string; nickname: string | null };

/**
 * 渲染components／ProfileTopbar.tsx界面及其子组件。
 * 接口协作：/api/auth/me、/api/auth/logout。
 */
export function ProfileTopbar() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((payload: { user: UserInfo | null }) => setUser(payload.user))
      .catch(() => setUser(null))
      .finally(() => setChecked(true));
  }, []);

  /**
   * 请求退出登录并跳转到登录或首页入口。
   * 接口协作：/api/auth/logout。
   */
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="uc-topbar">
      <div className="uc-topbar-inner">
        <Link href="/home" className="uc-brand">
          <Emblem size={46} />
          <span>
            <strong>智游闽韵</strong>
            <small>FUJIAN CULTURE &amp; TRAVEL</small>
          </span>
        </Link>

        <span className="uc-topbar-divider" />
        <span className="uc-topbar-title">用户中心</span>

        <div className="uc-topbar-user">
          {checked && user ? (
            <>
              <span className="uc-topbar-hello">
                <UserRound size={16} /> 您好，{user.nickname || user.username}
              </span>
              <button onClick={logout} className="uc-topbar-exit">
                <LogOut size={16} /> 退出
              </button>
            </>
          ) : checked ? (
            <Link href="/login" className="uc-topbar-exit">
              <UserRound size={16} /> 登录 / 注册
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
