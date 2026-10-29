/**
 * @module-note app/admin/emergency/page.tsx
 * 平台管理中心：便民应急工单查询与处置。
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { MapPin, Phone, Search, Siren } from "lucide-react";

type Emergency = {
  id: string;
  kind: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  note: string | null;
  phone: string | null;
  status: "pending" | "handled" | "closed";
  createdAt: string;
  handledAt: string | null;
};

const kindLabels: Record<string, string> = { MEDICAL: "医疗求助", LOST: "走失寻人", TRAPPED: "受困救援", OTHER: "其他求助" };
const statusLabels: Record<string, string> = { pending: "待处理", handled: "已处理", closed: "已关闭" };
const filters = [["ALL", "全部"], ["pending", "待处理"], ["handled", "已处理"], ["closed", "已关闭"]] as const;

export default function AdminEmergencyPage() {
  const [items, setItems] = useState<Emergency[]>([]);
  const [stats, setStats] = useState({ pending: 0, handled: 0, closed: 0 });
  const [filter, setFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const [version, setVersion] = useState(0);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/emergency", { signal: controller.signal })
      .then((response) => response.json())
      .then((payload) => {
        setItems(payload.data ?? []);
        setStats(payload.stats ?? { pending: 0, handled: 0, closed: 0 });
      })
      .catch(() => {});
    return () => controller.abort();
  }, [version]);

  const visible = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return items
      .filter((item) => filter === "ALL" || item.status === filter)
      .filter((item) => !keyword || `${item.note ?? ""}${item.phone ?? ""}${kindLabels[item.kind] ?? item.kind}`.toLowerCase().includes(keyword))
      .sort((a, b) => (a.status === "pending" ? -1 : 1) - (b.status === "pending" ? -1 : 1));
  }, [items, filter, query]);

  async function update(item: Emergency, status: "handled" | "closed") {
    if (!window.confirm(status === "handled" ? "确认该工单已处理？" : "确认关闭该工单？")) return;
    const response = await fetch("/api/admin/emergency", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, status }),
    });
    const payload = await response.json();
    setMessage(payload.error ?? (status === "handled" ? "工单已标记为已处理" : "工单已关闭"));
    if (response.ok) setVersion((value) => value + 1);
  }

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div><p>EMERGENCY RESPONSE</p><h1>应急工单</h1><span>集中查看游客一键求助记录，跟进处理状态并保留处置时间。</span></div>
        <div className="admin-date"><Siren size={16}/>待处理 {stats.pending} 条</div>
      </div>

      <div className="admin-mini-grid mb-5">
        <div className="admin-mini"><span>待处理</span><b>{stats.pending}<small>条</small></b></div>
        <div className="admin-mini"><span>已处理</span><b>{stats.handled}<small>条</small></b></div>
        <div className="admin-mini"><span>已关闭</span><b>{stats.closed}<small>条</small></b></div>
        <div className="admin-mini"><span>工单总量</span><b>{items.length}<small>条</small></b></div>
      </div>

      <section className="admin-panel overflow-hidden p-0">
        <div className="admin-toolbar">
          <div className="admin-tabs">
            {filters.map(([value, label]) => (
              <button key={value} className={`admin-tab ${filter === value ? "active" : ""}`} onClick={() => setFilter(value)}>
                {label}{value !== "ALL" && <span className="ml-1 opacity-60">{stats[value as keyof typeof stats]}</span>}
              </button>
            ))}
          </div>
          <label className="admin-search"><Search size={15}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索备注、电话或类型"/></label>
        </div>
        {message && <p className="border-b border-[#eee5da] bg-[#fdf6f2] px-5 py-2 text-[11px] text-[#a3483b]">{message}</p>}

        <div className="overflow-x-auto">
          <table className="admin-booking-table min-w-[1000px]">
            <thead><tr><th>求助类型</th><th>位置与描述</th><th>联系电话</th><th>提交时间</th><th>状态</th><th>处置</th></tr></thead>
            <tbody>
              {visible.map((item) => (
                <tr key={item.id}>
                  <td><b>{kindLabels[item.kind] ?? item.kind}</b><small>精度 {item.accuracy ? `${Math.round(item.accuracy)} 米` : "未知"}</small></td>
                  <td>
                    <b>{item.note || "游客未填写补充说明"}</b>
                    <small>
                      <a className="inline-flex items-center gap-1 text-[#315f58]" href={`https://uri.amap.com/marker?position=${item.lng},${item.lat}&name=${encodeURIComponent("应急求助位置")}`} target="_blank" rel="noreferrer">
                        <MapPin size={11}/>{item.lng.toFixed(4)}, {item.lat.toFixed(4)}
                      </a>
                    </small>
                  </td>
                  <td>{item.phone ? <a className="inline-flex items-center gap-1 text-[#315f58]" href={`tel:${item.phone}`}><Phone size={11}/>{item.phone}</a> : "未留电话"}</td>
                  <td>{new Date(item.createdAt).toLocaleString("zh-CN")}</td>
                  <td><span className={`admin-booking-status ${item.status === "pending" ? "confirmed" : item.status === "handled" ? "verified" : ""}`}>{statusLabels[item.status]}</span></td>
                  <td className="whitespace-nowrap">
                    {item.status === "pending" && <button className="admin-action primary mr-2" onClick={() => update(item, "handled")}>标记已处理</button>}
                    {item.status !== "closed" && <button className="admin-action" onClick={() => update(item, "closed")}>关闭</button>}
                    {item.status === "closed" && <span className="text-[10px] text-[#9a9289]">无需操作</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visible.length && <p className="admin-empty">当前没有符合条件的工单</p>}
        </div>
      </section>

      <p className="mt-4 text-[10px] leading-relaxed text-[#9a9289]">说明：本平台仅登记与跟进求助信息，不接入公安或急救调度系统；紧急情况请同时拨打 110 / 120。</p>
    </div>
  );
}
