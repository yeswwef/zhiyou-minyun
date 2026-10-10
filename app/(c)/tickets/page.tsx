"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarDays, MapPin, Search, Ticket, Users } from "lucide-react";

type TicketItem = { id: string; title: string; summary: string; image: string | null; venue: { name: string; address: string; type: string }; slots: Array<{ id: string; startAt: string; remaining: number; crowd: { label: string; color: string } }> };
const types = [["", "全部"], ["SCENIC", "景区"], ["MUSEUM", "博物馆"], ["PERFORMANCE", "演出"]] as const;

export default function TicketsPage() {
  const [items, setItems] = useState<TicketItem[]>([]); const [q, setQ] = useState(""); const [type, setType] = useState(""); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true); setError("");
      try {
        const response = await fetch(`/api/tickets?q=${encodeURIComponent(q)}&type=${type}`, { signal: controller.signal });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "票务信息加载失败");
        setItems(payload.data ?? []);
      } catch (reason) {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "票务信息加载失败");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [q, type, retry]);
  return <main className="min-h-screen bg-[#f8f3eb] text-[#25332f]">
    <section className="border-b border-[#eadfd0] bg-[linear-gradient(120deg,#fffaf3,#f5e6d4)] px-5 py-14"><div className="mx-auto max-w-6xl"><p className="mb-3 text-xs font-semibold tracking-[.28em] text-[#b54832]">FUJIAN CULTURE · SMART BOOKING</p><h1 className="font-serif text-4xl md:text-5xl">福州文旅票务预约</h1><p className="mt-4 max-w-2xl text-[#68736f]">景区、博物馆与演出统一预约。实时查看余票与拥挤程度，选择更舒适的出行时段。</p></div></section>
    <section className="mx-auto max-w-6xl px-5 py-8"><div className="rounded-2xl border border-[#e7ded2] bg-white p-4 shadow-sm"><div className="flex items-center gap-3 rounded-xl bg-[#f7f5f1] px-4"><Search size={18} className="text-slate-400"/><input value={q} onChange={(e) => setQ(e.target.value)} className="h-12 w-full bg-transparent outline-none" placeholder="搜索景区、博物馆或演出"/></div><div className="mt-4 flex flex-wrap gap-2">{types.map(([value,label]) => <button key={value} onClick={() => setType(value)} className={`rounded-full px-5 py-2 text-sm ${type===value ? "bg-[#b9352b] text-white" : "bg-[#f4f1ec] text-[#65706c]"}`}>{label}</button>)}</div></div>
      <div className="mt-8 flex items-end justify-between"><h2 className="font-serif text-2xl">可预约项目</h2><span className="text-sm text-slate-500">共 {items.length} 项</span></div>
      {loading ? <p className="py-16 text-center text-slate-400">正在加载票务信息…</p> : error ? <div className="mt-5 rounded-2xl border border-[#ead8d1] bg-white py-16 text-center"><p className="text-sm text-[#b83c2f]">{error}</p><button onClick={() => setRetry((value) => value + 1)} className="mt-4 rounded-lg bg-[#25332f] px-5 py-2 text-sm text-white">重新加载</button></div> : <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{items.map((item) => { const slot=item.slots[0]; return <Link href={`/tickets/${item.id}`} key={item.id} className="group overflow-hidden rounded-2xl border border-[#e6ded3] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><div className="h-40 bg-[#e8dfd1] bg-cover bg-center" style={{backgroundImage:`url(${item.image || "/images/sanfangqixiang.jpg"})`}}/><div className="p-5"><div className="flex items-center justify-between"><span className="rounded bg-[#f7e7df] px-2 py-1 text-xs text-[#af4431]">{types.find((t)=>t[0]===item.venue.type)?.[1]}</span>{slot && <span className={`text-xs ${slot.crowd.color==="green"?"text-emerald-600":"text-orange-600"}`}><Users size={13} className="mr-1 inline"/>{slot.crowd.label}</span>}</div><h3 className="mt-3 text-lg font-semibold group-hover:text-[#b9352b]">{item.title}</h3><p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{item.summary}</p><p className="mt-4 flex items-center gap-1 text-xs text-slate-500"><MapPin size={14}/>{item.venue.name}</p>{slot ? <p className="mt-2 flex items-center justify-between text-sm"><span><CalendarDays size={14} className="mr-1 inline"/>{new Date(slot.startAt).toLocaleString("zh-CN", {month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"})}</span><b className="text-[#b9352b]">余 {slot.remaining}</b></p> : <p className="mt-2 text-sm text-slate-400">暂无开放时段</p>}</div></Link>})}</div>}
      {!loading && !error && items.length===0 && <div className="mt-5 rounded-2xl border border-dashed border-[#d9cfc2] bg-white py-20 text-center text-slate-400"><Ticket className="mx-auto mb-3"/>暂无符合条件的票务项目</div>}
    </section>
  </main>;
}
