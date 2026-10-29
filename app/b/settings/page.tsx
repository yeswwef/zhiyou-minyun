/**
 * @module-note app/b/settings/page.tsx
 * 商户端／账户设置页面。客户端组件负责状态与交互，数据经接口获取；不要在此放服务端密钥。
 */
"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

type MeUser = {
  id: string;
  username: string;
  nickname: string | null;
  role: "C" | "B";
  merchantName: string | null;
  merchantAddress: string | null;
  legalPerson: string | null;
  merchantPhone: string | null;
  creditCode: string | null;
  merchantIntro: string | null;
  createdAt: string;
};

/**
 * 渲染商户端／账户设置界面及其子组件。
 * 接口协作：/api/auth/me、/api/auth/change-password。
 */
export default function MerchantSettingsPage() {
  const [user, setUser] = useState<MeUser | null>(null);
  const [checked, setChecked] = useState(false);

  const [nickname, setNickname] = useState("");
  const [merchantName, setMerchantName] = useState("");
  const [merchantAddress, setMerchantAddress] = useState("");
  const [legalPerson, setLegalPerson] = useState("");
  const [merchantPhone, setMerchantPhone] = useState("");
  const [creditCode, setCreditCode] = useState("");
  const [merchantIntro, setMerchantIntro] = useState("");
  const [profileMsg, setProfileMsg] = useState("");
  const [profileErr, setProfileErr] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);

  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdMsg, setPwdMsg] = useState("");
  const [pwdErr, setPwdErr] = useState("");
  const [pwdBusy, setPwdBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((payload: { user: MeUser | null }) => {
        setUser(payload.user);
        setNickname(payload.user?.nickname ?? "");
        setMerchantName(payload.user?.merchantName ?? "");
        setMerchantAddress(payload.user?.merchantAddress ?? "");
        setLegalPerson(payload.user?.legalPerson ?? "");
        setMerchantPhone(payload.user?.merchantPhone ?? "");
        setCreditCode(payload.user?.creditCode ?? "");
        setMerchantIntro(payload.user?.merchantIntro ?? "");
      })
      .catch(() => setUser(null))
      .finally(() => setChecked(true));
  }, []);

  /**
   * 保存商户资料表单。
   * 接口协作：/api/auth/me。
   * 输入：event；类型与可选项见函数签名。
   */
  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileMsg("");
    setProfileErr("");
    setProfileBusy(true);

    const body: Record<string, string> = { nickname };
    if (user?.role === "B") {
      body.merchantName = merchantName;
      body.merchantAddress = merchantAddress;
      body.legalPerson = legalPerson;
      body.merchantPhone = merchantPhone;
      body.creditCode = creditCode;
      body.merchantIntro = merchantIntro;
    }

    const response = await fetch("/api/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as { user?: MeUser; error?: string };
    setProfileBusy(false);

    if (response.ok && payload.user) {
      setUser(payload.user);
      setNickname(payload.user.nickname ?? "");
      setMerchantName(payload.user.merchantName ?? "");
      setMerchantAddress(payload.user.merchantAddress ?? "");
      setLegalPerson(payload.user.legalPerson ?? "");
      setMerchantPhone(payload.user.merchantPhone ?? "");
      setCreditCode(payload.user.creditCode ?? "");
      setMerchantIntro(payload.user.merchantIntro ?? "");
      setProfileMsg("资料已更新");
    } else {
      setProfileErr(payload.error ?? "更新失败");
    }
  }

  /**
   * 提交旧密码与新密码以修改登录凭据。
   * 接口协作：/api/auth/change-password。
   * 输入：event；类型与可选项见函数签名。
   */
  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPwdMsg("");
    setPwdErr("");
    if (newPwd !== confirmPwd) {
      setPwdErr("两次输入的新密码不一致");
      return;
    }
    setPwdBusy(true);
    const response = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
    });
    const payload = (await response.json()) as { error?: string };
    setPwdBusy(false);
    if (response.ok) {
      setPwdMsg("密码修改成功");
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } else {
      setPwdErr(payload.error ?? "修改失败");
    }
  }

  if (!checked) {
    return <div className="text-sm text-stone-500">加载中……</div>;
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-10 text-center text-sm text-stone-500">
        请先{" "}
        <Link href="/login" className="text-brand">
          登录
        </Link>{" "}
        后查看账户设置。
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">账户设置</h1>
        <p className="mt-1 text-xs text-stone-500">管理店铺信息与账号安全</p>
      </div>

      <section className="rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-semibold">账号信息</h2>
        <dl className="mt-4 grid gap-3 text-xs md:grid-cols-3">
          <div>
            <dt className="text-stone-400">用户名</dt>
            <dd className="mt-1">{user.username}</dd>
          </div>
          <div>
            <dt className="text-stone-400">账号身份</dt>
            <dd className="mt-1">
              {user.role === "B" ? "商户 / 非遗传承人" : "游客"}
            </dd>
          </div>
          <div>
            <dt className="text-stone-400">注册时间</dt>
            <dd className="mt-1">
              {new Date(user.createdAt).toLocaleString("zh-CN")}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-semibold">店铺信息</h2>
        <form onSubmit={saveProfile} className="mt-4 grid max-w-2xl gap-4">
          {user.role === "B" ? (
            <>
              <label>
                <span className="mb-1 block text-xs text-stone-500">
                  店铺 / 工作室名称
                </span>
                <input
                  className="input"
                  value={merchantName}
                  onChange={(event) => setMerchantName(event.target.value)}
                  placeholder="如：福州三坊七巷文创店"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label>
                  <span className="mb-1 block text-xs text-stone-500">法定代表人 / 负责人</span>
                  <input className="input" value={legalPerson} onChange={(event) => setLegalPerson(event.target.value)} placeholder="如：林守艺" />
                </label>
                <label>
                  <span className="mb-1 block text-xs text-stone-500">联系电话</span>
                  <input className="input" value={merchantPhone} onChange={(event) => setMerchantPhone(event.target.value)} placeholder="如：0591-87654321" />
                </label>
              </div>

              <label>
                <span className="mb-1 block text-xs text-stone-500">经营地址</span>
                <input className="input" value={merchantAddress} onChange={(event) => setMerchantAddress(event.target.value)} placeholder="如：福州市鼓楼区南后街 88 号" />
              </label>

              <label>
                <span className="mb-1 block text-xs text-stone-500">统一社会信用代码</span>
                <input className="input" value={creditCode} onChange={(event) => setCreditCode(event.target.value)} placeholder="18 位统一社会信用代码" />
              </label>

              <label>
                <span className="mb-1 block text-xs text-stone-500">店铺 / 工作室简介</span>
                <textarea
                  className="input min-h-28 py-3"
                  value={merchantIntro}
                  onChange={(event) => setMerchantIntro(event.target.value)}
                  placeholder="介绍你的手艺、产品与体验课程，最多 400 字"
                  maxLength={400}
                />
              </label>
            </>
          ) : (
            <p className="rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-500">
              当前是游客账号。如需开店 / 开工作室，请用商户身份重新注册一个账号。
            </p>
          )}

          <label>
            <span className="mb-1 block text-xs text-stone-500">昵称</span>
            <input
              className="input"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="设置昵称"
            />
          </label>

          {profileErr && <p className="text-xs text-brand">{profileErr}</p>}
          {profileMsg && <p className="text-xs text-tea">{profileMsg}</p>}

          <button
            className="btn justify-self-start"
            type="submit"
            disabled={profileBusy || !nickname.trim()}
          >
            {profileBusy ? "保存中……" : "保存资料"}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-semibold">修改密码</h2>
        <form onSubmit={savePassword} className="mt-4 grid max-w-lg gap-4">
          <label>
            <span className="mb-1 block text-xs text-stone-500">当前密码</span>
            <input
              className="input"
              type="password"
              value={currentPwd}
              onChange={(event) => setCurrentPwd(event.target.value)}
              autoComplete="current-password"
            />
          </label>
          <label>
            <span className="mb-1 block text-xs text-stone-500">新密码</span>
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
            <span className="mb-1 block text-xs text-stone-500">确认新密码</span>
            <input
              className="input"
              type="password"
              value={confirmPwd}
              onChange={(event) => setConfirmPwd(event.target.value)}
              autoComplete="new-password"
            />
          </label>

          {pwdErr && <p className="text-xs text-brand">{pwdErr}</p>}
          {pwdMsg && <p className="text-xs text-tea">{pwdMsg}</p>}

          <button
            className="btn justify-self-start"
            type="submit"
            disabled={pwdBusy || !currentPwd || !newPwd || !confirmPwd}
          >
            {pwdBusy ? "提交中……" : "确认修改"}
          </button>
        </form>
      </section>
    </div>
  );
}
