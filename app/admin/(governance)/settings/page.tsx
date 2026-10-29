/**
 * @module-note app/admin/settings/page.tsx
 * 平台管理中心：运行环境、服务连接与安全基线（不展示任何密钥值）。
 */
import Link from "next/link";
import { stat } from "node:fs/promises";
import path from "node:path";
import { CheckCircle2, Database, ExternalLink, KeyRound, ShieldCheck, XCircle } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { modelReady } from "@/features/rag/providers";

/** 读取知识索引文件的体积与更新时间，失败时返回空状态。 */
async function indexInfo() {
  try {
    const file = path.join(process.cwd(), ".data", "rag", "index.json");
    const info = await stat(file);
    return { ok: true, size: info.size, updatedAt: info.mtime };
  } catch {
    return { ok: false, size: 0, updatedAt: null as Date | null };
  }
}

export default async function AdminSettingsPage() {
  const user = await getSessionUser();
  const [counts, index] = await Promise.all([
    Promise.all([
      prisma.user.count(),
      prisma.resource.count(),
      prisma.communityPost.count(),
      prisma.product.count(),
      prisma.order.count(),
      prisma.ticketBooking.count(),
      prisma.chatSession.count(),
    ]).then(([users, resources, posts, products, orders, bookings, sessions]) => ({ users, resources, posts, products, orders, bookings, sessions })).catch(() => null),
    indexInfo(),
  ]);

  let dbOk = true;
  try { await prisma.user.count(); } catch { dbOk = false; }

  const services = [
    { label: "MySQL 数据库", ok: dbOk, note: "Prisma 连接" },
    { label: "大模型服务", ok: modelReady(), note: "千问 OpenAI 兼容接口" },
    { label: "高德地图服务", ok: Boolean(process.env.AMAP_WEB_KEY), note: "POI / 静态图 / 导航" },
    { label: "联网检索", ok: process.env.RAG_WEB_ENABLED !== "false", note: "可关闭，关闭后实时问题拒答" },
    { label: "会话签名密钥", ok: Boolean(process.env.AUTH_SECRET), note: "Cookie HMAC" },
    { label: "知识索引", ok: index.ok, note: index.ok ? `${Math.round(index.size / 1024 / 1024 * 10) / 10} MB` : "未构建" },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div><p>SYSTEM &amp; SECURITY</p><h1>系统设置</h1><span>查看运行环境、服务连接与安全基线。此处不展示任何密钥明文。</span></div>
        <div className="admin-date"><ShieldCheck size={16}/>配置只读</div>
      </div>

      <div className="admin-settings-grid">
        <section className="admin-panel">
          <div className="admin-panel-heading"><div><p>RUNTIME</p><h2>运行环境</h2></div></div>
          <div className="admin-kv"><span>应用框架</span><b>Next.js 16.3.6 · App Router</b></div>
          <div className="admin-kv"><span>UI 运行时</span><b>React 19.2.8</b></div>
          <div className="admin-kv"><span>数据层</span><b>Prisma 7.10 · MySQL 8</b></div>
          <div className="admin-kv"><span>语言与样式</span><b>TypeScript 5 · Tailwind CSS 4</b></div>
          <div className="admin-kv"><span>知识索引版本</span><b>{index.updatedAt ? index.updatedAt.toLocaleString("zh-CN") : "未构建"}</b></div>
          <div className="admin-kv"><span>演示数据</span><b>资源、商品、社区与票务均为本地演示数据</b></div>
        </section>

        <section className="admin-panel">
          <div className="admin-panel-heading"><div><p>SERVICE STATUS</p><h2>服务连接</h2></div></div>
          <div className="grid gap-2.5">
            {services.map((service) => (
              <div key={service.label} className="flex items-center justify-between gap-3 rounded-lg border border-[#eee5da] bg-[#fffdfa] px-3 py-2.5">
                <div><b className="block text-[11.5px] text-[#2f3935]">{service.label}</b><small className="text-[9.5px] text-[#9a9289]">{service.note}</small></div>
                <span className={`inline-flex items-center gap-1 text-[10px] ${service.ok ? "text-[#4f7d5c]" : "text-[#a3483b]"}`}>
                  {service.ok ? <CheckCircle2 size={13}/> : <XCircle size={13}/>}{service.ok ? "正常" : "未配置"}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-panel">
          <div className="admin-panel-heading"><div><p>DATA SCALE</p><h2>数据规模</h2></div></div>
          {counts ? (
            <>
              <div className="admin-kv"><span>账号</span><b>{counts.users} 个</b></div>
              <div className="admin-kv"><span>文旅资源 / 社区内容</span><b>{counts.resources} 条 / {counts.posts} 篇</b></div>
              <div className="admin-kv"><span>商品 / 商城订单</span><b>{counts.products} 件 / {counts.orders} 笔</b></div>
              <div className="admin-kv"><span>票务预约</span><b>{counts.bookings} 单</b></div>
              <div className="admin-kv"><span>AI 问答会话</span><b>{counts.sessions} 次</b></div>
            </>
          ) : (
            <p className="admin-empty">数据库暂时无法读取</p>
          )}
          <div className="mt-3 flex items-center gap-2 text-[10px] text-[#9a9289]"><Database size={12}/>统计为实时数据库计数</div>
        </section>

        <section className="admin-panel">
          <div className="admin-panel-heading"><div><p>SECURITY</p><h2>账号与安全</h2></div></div>
          <div className="admin-kv"><span>当前管理员</span><b>{user?.nickname || user?.username || "—"}</b></div>
          <div className="admin-kv"><span>角色边界</span><b>ADMIN / B / C 三端隔离</b></div>
          <div className="admin-kv"><span>密钥管理</span><b>仅环境变量，不在页面展示</b></div>
          <div className="admin-kv"><span>公开仓库</span><b>.env 已排除，仅保留模板</b></div>
          <div className="mt-3 grid gap-2 text-[10px] leading-relaxed text-[#7c746d]">
            <p className="m-0 flex gap-1.5"><KeyRound size={12} className="mt-0.5 shrink-0"/>数据库口令、模型 Key 与高德 Key 均通过部署环境注入，不进入代码与 Git 历史。</p>
            <p className="m-0 flex gap-1.5"><ShieldCheck size={12} className="mt-0.5 shrink-0"/>角色调整、内容隐藏与商品上下架均写入服务端并即时刷新前台缓存。</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="admin-action" href="/home">返回前台</Link>
            <Link className="admin-action" href="/admin/users">管理账号</Link>
            <a className="admin-action" href="https://github.com/yeswwef/zhiyou-minyun" target="_blank" rel="noreferrer"><ExternalLink size={12}/>代码仓库</a>
          </div>
        </section>
      </div>

      <div className="note mt-5 rounded-xl border border-[#e9dfd2] bg-[#fffdf9] px-5 py-4 text-[11px] leading-relaxed text-[#7c746d]">
        <b className="text-[#2f3935]">说明：</b>本页只展示“是否配置”，不读取或回显任何密钥。若需要修改配置，请在服务器环境变量中调整并重启服务。
      </div>
    </div>
  );
}
