"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Building2, CalendarDays, CalendarPlus, CirclePause, CirclePlay, MapPin, Plus, TicketCheck, Users } from "lucide-react";

type Venue = { id: string; name: string; type: string; address: string; _count: { tickets: number } };
type Slot = { id: string; startAt: string; endAt: string; capacity: number; bookedCount: number; remaining: number; status: string };
type TicketItem = { id: string; title: string; summary: string; status: string; venue: { name: string }; slots: Slot[] };
const input = "h-11 rounded-lg border border-[#e2d8cc] bg-[#fffdfa] px-3 text-sm outline-none transition focus:border-[#b84434] focus:ring-2 focus:ring-[#b84434]/10";
const typeLabels: Record<string, string> = { SCENIC: "景区", MUSEUM: "博物馆", PERFORMANCE: "演出场馆" };

export default function AdminTicketsPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    const [venuePayload, ticketPayload] = await Promise.all([
      fetch("/api/admin/venues").then((response) => response.json()),
      fetch("/api/admin/tickets").then((response) => response.json()),
    ]);
    setVenues(venuePayload.data ?? []);
    setTickets(ticketPayload.data ?? []);
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/venues").then((response) => response.json()),
      fetch("/api/admin/tickets").then((response) => response.json()),
    ]).then(([venuePayload, ticketPayload]) => {
      setVenues(venuePayload.data ?? []);
      setTickets(ticketPayload.data ?? []);
    });
  }, []);

  const totals = useMemo(() => tickets.reduce((result, ticket) => {
    result.slots += ticket.slots.length;
    result.capacity += ticket.slots.reduce((sum, slot) => sum + slot.capacity, 0);
    result.booked += ticket.slots.reduce((sum, slot) => sum + slot.bookedCount, 0);
    return result;
  }, { slots: 0, capacity: 0, booked: 0 }), [tickets]);

  async function addVenue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const response = await fetch("/api/admin/venues", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
    const payload = await response.json();
    setMessage(payload.error ?? "场馆已创建并加入票务体系");
    if (response.ok) { form.reset(); await load(); }
  }

  async function addTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const response = await fetch("/api/admin/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
    const payload = await response.json();
    setMessage(payload.error ?? "票务项目已创建");
    if (response.ok) { form.reset(); await load(); }
  }

  async function addSlot(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const response = await fetch(`/api/admin/tickets/${id}/slots`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
    const payload = await response.json();
    setMessage(payload.error ?? "预约时段已添加");
    if (response.ok) { form.reset(); await load(); }
  }

  async function toggle(item: TicketItem) {
    await fetch(`/api/admin/tickets/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: item.status === "OPEN" ? "PAUSED" : "OPEN" }) });
    await load();
  }

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div><p>PLATFORM TICKETING</p><h1>票务与场馆管理</h1><span>统一维护场馆、预约项目、开放时段和承载容量。</span></div>
        {message && <div className="admin-date text-[#a53d31]"><TicketCheck size={16}/>{message}</div>}
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="admin-panel flex items-center gap-4 py-4"><i className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf3e9] text-[#5d7654]"><Building2 size={20}/></i><span><small className="block text-[10px] text-[#938b82]">已接入场馆</small><b className="text-xl">{venues.length}</b></span></div>
        <div className="admin-panel flex items-center gap-4 py-4"><i className="grid h-10 w-10 place-items-center rounded-xl bg-[#faece8] text-[#b84434]"><CalendarDays size={20}/></i><span><small className="block text-[10px] text-[#938b82]">开放时段</small><b className="text-xl">{totals.slots}</b></span></div>
        <div className="admin-panel flex items-center gap-4 py-4"><i className="grid h-10 w-10 place-items-center rounded-xl bg-[#e9f1ef] text-[#315f58]"><Users size={20}/></i><span><small className="block text-[10px] text-[#938b82]">预约承载</small><b className="text-xl">{totals.booked}<em className="ml-1 text-xs not-italic font-normal text-[#938b82]">/ {totals.capacity} 人</em></b></span></div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <form onSubmit={addVenue} className="admin-panel">
          <div className="admin-panel-heading"><div><p>VENUE PROFILE</p><h2 className="flex items-center gap-2"><Building2 size={18}/>新建场馆</h2></div><span className="text-[10px] text-[#9b938a]">第一步</span></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="admin-form-label">场馆名称<input className={input} name="name" required placeholder="如：三坊七巷历史文化街区"/></label>
            <label className="admin-form-label">场馆类型<select className={input} name="type"><option value="SCENIC">景区</option><option value="MUSEUM">博物馆</option><option value="PERFORMANCE">演出场馆</option></select></label>
            <label className="admin-form-label sm:col-span-2">详细地址<input className={input} name="address" required placeholder="请输入场馆详细地址"/></label>
            <label className="admin-form-label">联系电话<input className={input} name="contact" placeholder="选填"/></label>
            <label className="admin-form-label">封面图片<input className={input} name="image" placeholder="图片 URL（选填）"/></label>
          </div>
          <button className="admin-submit dark"><Plus size={16}/>创建场馆</button>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-[#eee5da] pt-4">{venues.map((venue) => <span key={venue.id} className="rounded-full bg-[#f4efe8] px-3 py-1.5 text-[10px] text-[#686159]"><MapPin size={11} className="mr-1 inline"/>{venue.name} · {typeLabels[venue.type]} · {venue._count.tickets} 项</span>)}</div>
        </form>

        <form onSubmit={addTicket} className="admin-panel">
          <div className="admin-panel-heading"><div><p>TICKET PROJECT</p><h2 className="flex items-center gap-2"><CalendarPlus size={18}/>新建票务项目</h2></div><span className="text-[10px] text-[#9b938a]">第二步</span></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="admin-form-label">所属场馆<select className={input} name="venueId" required><option value="">请选择场馆</option>{venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}</select></label>
            <label className="admin-form-label">初始状态<select className={input} name="status"><option value="OPEN">直接开放</option><option value="DRAFT">保存草稿</option></select></label>
            <label className="admin-form-label sm:col-span-2">项目名称<input className={input} name="title" required placeholder="如：三坊七巷名人故居联票预约"/></label>
            <label className="admin-form-label sm:col-span-2">项目摘要<textarea className="min-h-20 rounded-lg border border-[#e2d8cc] bg-[#fffdfa] p-3 text-sm outline-none focus:border-[#b84434]" name="summary" required placeholder="简要说明预约内容"/></label>
            <label className="admin-form-label">项目介绍<textarea className="min-h-20 rounded-lg border border-[#e2d8cc] bg-[#fffdfa] p-3 text-sm outline-none focus:border-[#b84434]" name="description" placeholder="选填"/></label>
            <label className="admin-form-label">预约须知<textarea className="min-h-20 rounded-lg border border-[#e2d8cc] bg-[#fffdfa] p-3 text-sm outline-none focus:border-[#b84434]" name="notice" placeholder="选填"/></label>
          </div>
          <button disabled={!venues.length} className="admin-submit red"><Plus size={16}/>创建票务项目</button>
        </form>
      </div>

      <div className="mt-8 mb-4"><p className="text-[9px] font-bold tracking-[2px] text-[#b84434]">PROJECT & TIME SLOT</p><h2 className="mt-1 font-serif text-2xl">票务项目与分时时段</h2></div>
      <div className="space-y-4">
        {tickets.map((ticket) => {
          const capacity = ticket.slots.reduce((sum, slot) => sum + slot.capacity, 0);
          const booked = ticket.slots.reduce((sum, slot) => sum + slot.bookedCount, 0);
          return <article key={ticket.id} className="admin-panel overflow-hidden p-0">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#eee5da] px-5 py-5">
              <div><div className="flex items-center gap-2"><h3 className="font-serif text-lg font-semibold">{ticket.title}</h3><span className={`rounded px-2 py-1 text-[9px] font-semibold ${ticket.status === "OPEN" ? "bg-[#e9f3eb] text-[#4f7c5b]" : "bg-[#f6eee2] text-[#9b6e37]"}`}>{ticket.status === "OPEN" ? "开放预约" : "暂停开放"}</span></div><p className="mt-2 text-[11px] text-[#8e867d]">{ticket.venue.name} · {ticket.summary}</p><p className="mt-3 text-[10px] text-[#a29a91]">{ticket.slots.length} 个时段 · 已预约 {booked} / {capacity} 人</p></div>
              <button onClick={() => toggle(ticket)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#ddd2c6] bg-[#fffdfa] px-3 text-[10px] text-[#625c55]">{ticket.status === "OPEN" ? <><CirclePause size={15}/>暂停开放</> : <><CirclePlay size={15}/>开放预约</>}</button>
            </div>
            <div className="grid gap-3 bg-[#fbf8f3] px-5 py-4 md:grid-cols-2 xl:grid-cols-4">{ticket.slots.map((slot) => {
              const rate = slot.capacity ? Math.round(slot.bookedCount / slot.capacity * 100) : 0;
              return <div key={slot.id} className="rounded-xl border border-[#e9dfd4] bg-[#fffdfa] p-3"><b className="text-[11px]">{new Date(slot.startAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</b><p className="mt-2 text-[9px] text-[#928980]">容量 {slot.capacity} · 已约 {slot.bookedCount} · 剩余 {slot.remaining}</p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#eee8df]"><span className="block h-full rounded-full bg-[#b84434]" style={{ width: `${Math.min(100, rate)}%` }}/></div></div>})}</div>
            <form onSubmit={(event) => addSlot(event, ticket.id)} className="flex flex-wrap items-end gap-3 border-t border-[#eee5da] px-5 py-4">
              <label className="admin-form-label">开始时间<input name="startAt" type="datetime-local" required className={`mt-1 ${input}`}/></label>
              <label className="admin-form-label">结束时间<input name="endAt" type="datetime-local" required className={`mt-1 ${input}`}/></label>
              <label className="admin-form-label">容量<input name="capacity" type="number" min="1" defaultValue="100" required className={`mt-1 w-28 ${input}`}/></label>
              <button className="admin-submit dark m-0 h-11"><Plus size={15}/>添加时段</button>
            </form>
          </article>;
        })}
        {!tickets.length && <div className="admin-panel py-16 text-center text-sm text-[#9b938a]">请先创建场馆和票务项目</div>}
      </div>
    </div>
  );
}
