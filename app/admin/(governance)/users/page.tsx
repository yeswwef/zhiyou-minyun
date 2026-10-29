/**
 * @module-note app/admin/users/page.tsx
 * 平台管理中心：用户检索、角色分布与角色调整。
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, ShieldCheck, Store, UserRound } from "lucide-react";

type UserRow = {
  id: string;
  username: string;
  nickname: string | null;
  role: "C" | "B" | "ADMIN" | "TICKET_ADMIN";
  merchantName: string | null;
  disabledAt: string | null;
  createdAt: string;
  _count: {
    communityPosts: number; buyerOrders: number; merchantOrders: number; ticketBookings: number;
    products: number; favorites: number; studioWorks: number; experienceClasses: number;
  };
};
type Stats = { C: number; B: number; ADMIN: number; TICKET_ADMIN: number };

const roleLabels: Record<string, string> = { C: "游客", B: "商户", ADMIN: "平台管理员", TICKET_ADMIN: "景点管理员" };
const roleClass: Record<string, string> = { C: "visitor", B: "merchant", ADMIN: "admin", TICKET_ADMIN: "ticket" };
const filters = [["ALL", "全部"], ["C", "游客"], ["B", "商户"], ["ADMIN", "平台管理员"], ["TICKET_ADMIN", "景点管理员"]] as const;

export default function AdminUsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [stats, setStats] = useState<Stats>({ C: 0, B: 0, ADMIN: 0, TICKET_ADMIN: 0 });
  const [selfId, setSelfId] = useState("");
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("ALL");
  const [version, setVersion] = useState(0);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const search = new URLSearchParams();
      if (query.trim()) search.set("q", query.trim());
      if (role !== "ALL") search.set("role", role);
      fetch(`/api/admin/users?${search.toString()}`, { signal: controller.signal })
        .then((response) => response.json())
        .then((payload) => {
          setRows(payload.data ?? []);
          setStats(payload.stats ?? { C: 0, B: 0, ADMIN: 0, TICKET_ADMIN: 0 });
          setTotal(payload.total ?? 0);
          setSelfId(payload.selfId ?? "");
        })
        .catch(() => {});
    }, 180);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, role, version]);

  const summary = useMemo(() => [
    { label: "全部账号", value: total, icon: UserRound },
    { label: "游客", value: stats.C, icon: UserRound },
    { label: "商户", value: stats.B, icon: Store },
    { label: "平台 / 景点管理员", value: `${stats.ADMIN} / ${stats.TICKET_ADMIN}`, icon: ShieldCheck },
  ], [stats, total]);

  async function setAccountState(user: UserRow, action: "disable" | "enable") {
    const verb = action === "disable" ? "注销" : "恢复";
    if (!window.confirm(`确认${verb}「${user.nickname || user.username}」的账号？${action === "disable" ? "注销后该账号会立即退出且无法登录。" : ""}`)) return;
    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, action }),
    });
    const payload = await response.json();
    setMessage(payload.error ?? `已${verb}「${user.nickname || user.username}」的账号`);
    if (response.ok) setVersion((value) => value + 1);
  }

  async function changeRole(user: UserRow, next: string) {
    if (next === user.role) return;
    if (!window.confirm(`确认将「${user.nickname || user.username}」设为${roleLabels[next]}？`)) return;
    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, role: next }),
    });
    const payload = await response.json();
    setMessage(payload.error ?? `已更新「${user.nickname || user.username}」的角色`);
    if (response.ok) setVersion((value) => value + 1);
  }

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div><p>ACCOUNT &amp; ROLE</p><h1>用户与角色</h1><span>统一管理游客、商户与管理员账号，调整角色时同步影响三端权限。</span></div>
        <div className="admin-date"><ShieldCheck size={16}/>角色变更即时生效</div>
      </div>

      <div className="admin-mini-grid mb-5">
        {summary.map(({ label, value, icon: Icon }) => (
          <div className="admin-mini" key={label}>
            <span><Icon size={13} className="mr-1 inline"/>{label}</span>
            <b>{value}<small>个</small></b>
          </div>
        ))}
      </div>

      <section className="admin-panel overflow-hidden p-0">
        <div className="admin-toolbar">
          <div className="admin-tabs">
            {filters.map(([value, label]) => (
              <button key={value} className={`admin-tab ${role === value ? "active" : ""}`} onClick={() => setRole(value)}>
                {label}{value !== "ALL" && <span className="ml-1 opacity-60">{stats[value as keyof Stats]}</span>}
              </button>
            ))}
          </div>
          <label className="admin-search"><Search size={15}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索账号、昵称或店铺名"/></label>
        </div>
        {message && <p className="border-b border-[#eee5da] bg-[#fdf6f2] px-5 py-2 text-[11px] text-[#a3483b]">{message}</p>}
        <div className="overflow-x-auto">
          <table className="admin-booking-table">
            <thead><tr><th>账号</th><th>角色</th><th>内容与互动</th><th>交易与服务</th><th>注册时间</th><th>角色 / 状态</th></tr></thead>
            <tbody>
              {rows.map((user) => (
                <tr key={user.id}>
                  <td>
                    <b>{user.nickname || user.username}</b>
                    <small>@{user.username}{user.merchantName ? ` · ${user.merchantName}` : ""}</small>
                    {user.disabledAt && <span className="admin-role admin mt-1 inline-flex">已注销</span>}
                  </td>
                  <td><span className={`admin-role ${roleClass[user.role]}`}>{roleLabels[user.role]}</span></td>
                  <td><b>{user._count.communityPosts} 篇内容</b><small>收藏 {user._count.favorites} · 互动数据实时统计</small></td>
                  <td>
                    {user.role === "B" ? (
                      <><b>成交 {user._count.merchantOrders} 笔 · 商品 {user._count.products} 件</b><small>作品 {user._count.studioWorks} · 课程 {user._count.experienceClasses}</small></>
                    ) : (
                      <><b>{user._count.buyerOrders} 笔订单 / {user._count.ticketBookings} 次预约</b><small>游客消费与预约记录</small></>
                    )}
                  </td>
                  <td>{new Date(user.createdAt).toLocaleDateString("zh-CN")}</td>
                  <td>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <select
                        value={user.role}
                        onChange={(event) => changeRole(user, event.target.value)}
                        disabled={user.id === selfId || user.role === "ADMIN"}
                        title={user.id === selfId ? "不能修改自己的角色" : user.role === "ADMIN" ? "平台管理员账号受保护" : undefined}
                        className="h-8 rounded-md border border-[#e2d8cc] bg-[#fffdfa] px-2 text-[11px] text-[#5f5953] outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={`调整 ${user.username} 的角色`}
                      >
                        <option value="C">游客</option>
                        <option value="B">商户</option>
                        <option value="TICKET_ADMIN">景点管理员</option>
                        <option value="ADMIN">平台管理员</option>
                      </select>
                      {user.role !== "ADMIN" && (
                        <button
                          className={`admin-action ${user.disabledAt ? "" : "danger"}`}
                          onClick={() => setAccountState(user, user.disabledAt ? "enable" : "disable")}
                        >
                          {user.disabledAt ? "恢复账号" : "注销账号"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <p className="admin-empty">没有符合条件的账号</p>}
        </div>
      </section>

      <p className="mt-4 text-[10px] leading-relaxed text-[#9a9289]">规则：平台管理员账号受保护，不能在此修改或注销；注销其他端账号会立即失效其登录会话，恢复后可重新登录；系统至少保留一名平台管理员。</p>
    </div>
  );
}
