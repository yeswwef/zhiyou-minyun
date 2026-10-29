/**
 * @module-note app/admin/dashboard/page.tsx
 * 平台管理中心总览：用户、内容、交易、票务、AI 与应急的全域运行态势。
 */
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CircleAlert,
  Clock3,
  Map,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Store,
  UsersRound,
  Wallet,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { AdminDashboardCharts } from "@/components/admin/AdminDashboardCharts";

const ORDER_STATUS: Record<string, string> = {
  PENDING: "待支付",
  PAID: "已支付",
  VERIFIED: "已核销",
  CANCELLED: "已取消",
};

/** 归一到当天零点，用于趋势统计。 */
function dayStart(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** 生成图表日期标签。 */
function dayLabel(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/** 统计指定时间区间内的新增数量。 */
function countInRange(rows: { createdAt: Date }[], start: Date, end: Date) {
  return rows.filter((row) => row.createdAt >= start && row.createdAt < end).length;
}

export default async function AdminDashboard() {
  const now = new Date();
  const today = dayStart(now);
  const since = new Date(today);
  since.setDate(since.getDate() - 6);

  const [
    users, roleGroups, resources, posts, hiddenPosts, products, orders, pendingOrders, revenue,
    pendingBookings, pendingEmergencies, sessions, messages,
    recentOrders, recentPosts, recentEmergencies,
    userDates, postDates, orderDates,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.resource.count(),
    prisma.communityPost.count(),
    prisma.communityPost.count({ where: { status: "HIDDEN" } }),
    prisma.product.count(),
    prisma.order.count(),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.aggregate({ _sum: { amount: true }, where: { status: { in: ["PAID", "VERIFIED"] } } }),
    prisma.ticketBooking.count({ where: { status: "CONFIRMED" } }),
    prisma.emergencyRequest.count({ where: { status: "pending" } }),
    prisma.chatSession.count(),
    prisma.chatMessage.count(),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { product: { select: { title: true } }, buyer: { select: { username: true, nickname: true } } },
    }),
    prisma.communityPost.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { username: true, nickname: true } }, resource: { select: { title: true } } },
    }),
    prisma.emergencyRequest.findMany({ where: { status: "pending" }, take: 3, orderBy: { createdAt: "desc" } }),
    prisma.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.communityPost.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.order.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
  ]);

  const roleCount = { C: 0, B: 0, ADMIN: 0, TICKET_ADMIN: 0 } as Record<string, number>;
  for (const group of roleGroups) roleCount[group.role] = group._count._all;

  const trend = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(since);
    date.setDate(date.getDate() + index);
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    return {
      date: dayLabel(date),
      users: countInRange(userDates, date, next),
      posts: countInRange(postDates, date, next),
      orders: countInRange(orderDates, date, next),
    };
  });

  const roles = [
    { name: "游客", value: roleCount.C },
    { name: "商户", value: roleCount.B },
    { name: "平台管理员", value: roleCount.ADMIN },
    { name: "景点管理员", value: roleCount.TICKET_ADMIN },
  ];
  const revenueYuan = Math.round((revenue._sum.amount ?? 0) / 100);
  const metrics = [
    { label: "注册用户", value: users, suffix: "人", hint: `游客 ${roleCount.C} · 商户 ${roleCount.B} · 平台 ${roleCount.ADMIN} · 景点 ${roleCount.TICKET_ADMIN}`, icon: UsersRound, tone: "green" },
    { label: "文旅资源", value: resources, suffix: "条", hint: "景点、非遗与美食内容", icon: Map, tone: "teal" },
    { label: "社区内容", value: posts, suffix: "篇", hint: hiddenPosts ? `${hiddenPosts} 篇处于隐藏状态` : "全部正常展示", icon: MessageSquareText, tone: "amber" },
    { label: "累计交易额", value: `¥${revenueYuan.toLocaleString("zh-CN")}`, suffix: "", hint: `${orders} 笔订单 · 演示支付`, icon: Wallet, tone: "red" },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div><p>PLATFORM OVERVIEW</p><h1>平台总览</h1><span>从账号、内容、交易到 AI 与应急，掌握智游闽韵的整体运行状态。</span></div>
        <div className="admin-date"><Clock3 size={16}/><span>{now.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}</span></div>
      </div>

      <div className="admin-metric-grid">
        {metrics.map(({ label, value, suffix, hint, icon: Icon, tone }) => (
          <section className={`admin-metric ${tone}`} key={label}>
            <div><p>{label}</p><strong>{value}<small>{suffix}</small></strong><span>{hint}</span></div>
            <i><Icon size={22}/></i>
          </section>
        ))}
      </div>

      <div className="admin-mini-grid mb-5">
        <div className="admin-mini"><span>商户账号</span><b>{roleCount.B}<small>家</small></b></div>
        <div className="admin-mini"><span>平台商品</span><b>{products}<small>件</small></b></div>
        <div className="admin-mini"><span>AI 问答会话</span><b>{sessions}<small>次</small></b></div>
        <div className="admin-mini"><span>AI 消息总量</span><b>{messages}<small>条</small></b></div>
      </div>

      <AdminDashboardCharts trend={trend} roles={roles} />

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_.75fr]">
        <section className="admin-panel">
          <div className="admin-panel-heading"><div><p>LATEST ORDERS</p><h2>最新商城订单</h2></div><Link href="/admin/commerce">查看全部 <ArrowRight size={14}/></Link></div>
          <div className="admin-recent-list">
            {recentOrders.map((order) => (
              <div key={order.id}>
                <span className={`admin-status-dot ${order.status.toLowerCase()}`} />
                <div><b>{order.product.title}</b><small>{order.buyer.nickname || order.buyer.username} · {order.orderNo}</small></div>
                <time>{new Date(order.createdAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time>
                <em>{ORDER_STATUS[order.status] ?? order.status}</em>
              </div>
            ))}
            {!recentOrders.length && <div className="admin-empty-row">暂无商城订单</div>}
          </div>
        </section>

        <section className="admin-panel admin-operation-panel">
          <div className="admin-panel-heading"><div><p>TO-DO &amp; RISK</p><h2>待办与风险</h2></div></div>
          <div className="admin-operation-lines">
            <p><span>待核销票务预约</span><b><CalendarClock size={14}/>{pendingBookings} 单</b></p>
            <p><span>待支付商城订单</span><b><Store size={14}/>{pendingOrders} 笔</b></p>
            <p><span>待响应应急工单</span><b className={pendingEmergencies ? "" : "muted"}><CircleAlert size={14}/>{pendingEmergencies} 条</b></p>
            <p><span>隐藏社区内容</span><b className={hiddenPosts ? "" : "muted"}><ShieldCheck size={14}/>{hiddenPosts} 篇</b></p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Link className="admin-quick-link primary" href="/admin/users">用户与角色</Link>
            <Link className="admin-quick-link" href="/admin/commerce">商户与交易</Link>
            <Link className="admin-quick-link" href="/admin/content">内容治理</Link>
            <Link className="admin-quick-link" href="/admin/ai">AI 运营</Link>
          </div>
        </section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_.75fr]">
        <section className="admin-panel">
          <div className="admin-panel-heading"><div><p>LATEST COMMUNITY</p><h2>最新社区内容</h2></div><Link href="/admin/content">查看全部 <ArrowRight size={14}/></Link></div>
          <div className="admin-recent-list">
            {recentPosts.map((post) => (
              <div key={post.id}>
                <span className={`admin-status-dot ${post.status === "PUBLISHED" ? "verified" : "cancelled"}`} />
                <div><b>{post.title}</b><small>{post.user.nickname || post.user.username} · {post.resource.title}</small></div>
                <time>{new Date(post.createdAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time>
                <em>{post.status === "PUBLISHED" ? "展示中" : "已隐藏"}</em>
              </div>
            ))}
            {!recentPosts.length && <div className="admin-empty-row">暂无社区内容</div>}
          </div>
        </section>

        <section className="admin-panel">
          <div className="admin-panel-heading"><div><p>EMERGENCY</p><h2>应急工单</h2></div><Link href="/admin/emergency">查看全部 <ArrowRight size={14}/></Link></div>
          <div className="admin-recent-list">
            {recentEmergencies.map((item) => (
              <div key={item.id}>
                <span className="admin-status-dot confirmed" />
                <div><b>{item.kind}</b><small>{item.note || "游客提交了应急求助"}</small></div>
                <time>{new Date(item.createdAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time>
                <em>待处理</em>
              </div>
            ))}
            {!recentEmergencies.length && <div className="admin-empty-row">暂无待处理工单</div>}
          </div>
          <div className="mt-4 flex items-center gap-2 text-[10px] text-[#9a9289]"><Sparkles size={13}/>建议每日巡检一次 AI 与应急数据</div>
        </section>
      </div>
    </div>
  );
}
