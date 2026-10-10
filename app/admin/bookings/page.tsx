"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Search, ShieldCheck, TicketCheck, Users } from "lucide-react";

type Booking = { id: string; bookingNo: string; verifyCode: string; status: string; quantity: number; contactName: string; contactPhone: string; createdAt: string; user: { username: string; nickname: string | null }; slot: { startAt: string; ticketItem: { title: string; venue: { name: string } } } };
const labels: Record<string, string> = { CONFIRMED: "待核销", VERIFIED: "已核销", CANCELLED: "已取消", EXPIRED: "已过期" };
const filters = [["ALL", "全部"], ["CONFIRMED", "待核销"], ["VERIFIED", "已核销"], ["CANCELLED", "已取消"]] as const;

export default function AdminBookingsPage() {
  const [items, setItems] = useState<Booking[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [message, setMessage] = useState("");
  async function load() { const payload = await fetch("/api/admin/bookings").then((response) => response.json()); setItems(payload.data ?? []); }
  useEffect(() => { fetch("/api/admin/bookings").then((response) => response.json()).then((payload) => setItems(payload.data ?? [])); }, []);

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch("/api/admin/bookings/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ verifyCode: data.get("verifyCode") }) });
    const payload = await response.json();
    setMessage(payload.error ?? `核销成功：${payload.booking?.slot.ticketItem.title}`);
    if (response.ok) { form.reset(); await load(); }
  }

  const counts = useMemo(() => Object.fromEntries(["CONFIRMED", "VERIFIED", "CANCELLED", "EXPIRED"].map((status) => [status, items.filter((item) => item.status === status).length])), [items]);
  const filtered = items.filter((item) => (filter === "ALL" || item.status === filter) && `${item.bookingNo}${item.verifyCode}${item.contactName}${item.contactPhone}${item.slot.ticketItem.title}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="admin-page">
      <div className="admin-page-head"><div><p>BOOKING VERIFICATION</p><h1>预约与核销</h1><span>统一查询游客预约记录，完成现场核验与状态流转。</span></div><div className="admin-date"><ShieldCheck size={16}/>核销接口运行正常</div></div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <form onSubmit={verify} className="admin-verify-card">
          <div><span><TicketCheck size={19}/></span><div><p>ON-SITE VERIFICATION</p><h2>现场核销</h2><small>输入游客订单中的 6 位核销码</small></div></div>
          <div className="admin-verify-input"><input name="verifyCode" required pattern="\d{6}" maxLength={6} inputMode="numeric" placeholder="000000"/><button>确认核销</button></div>
          {message && <p className="admin-verify-message">{message}</p>}
        </form>
        <div className="grid grid-cols-2 gap-3">
          <div className="admin-panel flex items-center gap-3 p-4"><i className="grid h-10 w-10 place-items-center rounded-xl bg-[#fbf0df] text-[#b8792b]"><Clock3 size={19}/></i><span><small className="block text-[9px] text-[#948b82]">待核销</small><b className="text-2xl">{counts.CONFIRMED}</b></span></div>
          <div className="admin-panel flex items-center gap-3 p-4"><i className="grid h-10 w-10 place-items-center rounded-xl bg-[#e9f3eb] text-[#4f7d5c]"><CheckCircle2 size={19}/></i><span><small className="block text-[9px] text-[#948b82]">已核销</small><b className="text-2xl">{counts.VERIFIED}</b></span></div>
          <div className="admin-panel col-span-2 flex items-center gap-3 p-4"><i className="grid h-10 w-10 place-items-center rounded-xl bg-[#e9f1ef] text-[#315f58]"><Users size={19}/></i><span><small className="block text-[9px] text-[#948b82]">累计预约人数</small><b className="text-2xl">{items.reduce((sum, item) => sum + item.quantity, 0)} <em className="text-[10px] not-italic font-normal text-[#948b82]">人次</em></b></span></div>
        </div>
      </div>

      <section className="admin-panel mt-5 p-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-[#eee5da] px-5 py-4">
          <div className="flex flex-wrap gap-2">{filters.map(([value, label]) => <button key={value} onClick={() => setFilter(value)} className={`rounded-lg px-3 py-2 text-[10px] transition ${filter === value ? "bg-[#173330] text-white" : "bg-[#f4efe8] text-[#746c64]"}`}>{label}{value !== "ALL" && <span className="ml-1 opacity-60">{counts[value] ?? 0}</span>}</button>)}</div>
          <label className="ml-auto flex h-10 min-w-[280px] items-center gap-2 rounded-lg border border-[#e2d8cc] bg-[#fffdfa] px-3"><Search size={15} className="text-[#999188]"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索预约单号、联系人或项目" className="w-full bg-transparent text-xs outline-none"/></label>
        </div>
        <div className="overflow-x-auto">
          <table className="admin-booking-table">
            <thead><tr><th>预约项目</th><th>游客与联系人</th><th>预约时段</th><th>人数</th><th>核销码</th><th>状态</th></tr></thead>
            <tbody>{filtered.map((item) => <tr key={item.id}><td><b>{item.slot.ticketItem.title}</b><small>{item.slot.ticketItem.venue.name}<br/>{item.bookingNo}</small></td><td>{item.user.nickname || item.user.username}<small>{item.contactName} · {item.contactPhone}</small></td><td>{new Date(item.slot.startAt).toLocaleString("zh-CN")}</td><td>{item.quantity}</td><td><code>{item.verifyCode}</code></td><td><span className={`admin-booking-status ${item.status.toLowerCase()}`}>{item.status === "VERIFIED" && <CheckCircle2 size={12}/>} {labels[item.status] ?? item.status}</span></td></tr>)}</tbody>
          </table>
          {!filtered.length && <p className="py-16 text-center text-xs text-[#9c948b]">没有符合条件的预约记录</p>}
        </div>
      </section>
    </div>
  );
}
