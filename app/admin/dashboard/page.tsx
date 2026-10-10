import Link from "next/link";
import { ArrowRight, Building2, CalendarClock, CheckCircle2, CircleGauge, Clock3, TicketCheck } from "lucide-react";
import { prisma } from "@/lib/db";
import { AdminDashboardCharts } from "@/components/admin/AdminDashboardCharts";

const statusLabels: Record<string, string> = {
  CONFIRMED: "待核销",
  VERIFIED: "已核销",
  CANCELLED: "已取消",
  EXPIRED: "已过期",
};

function dayStart(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function dayLabel(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export default async function AdminDashboard() {
  const now = new Date();
  const start = dayStart(now);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  const [venues, tickets, pendingBookings, verifiedBookings, slots, statusGroups, recentBookings] = await Promise.all([
    prisma.venue.count({ where: { enabled: true } }),
    prisma.ticketItem.count({ where: { status: "OPEN" } }),
    prisma.ticketBooking.count({ where: { status: "CONFIRMED" } }),
    prisma.ticketBooking.count({ where: { status: "VERIFIED" } }),
    prisma.ticketSlot.findMany({
      where: { status: "OPEN", startAt: { gte: start, lt: end } },
      select: { startAt: true, capacity: true, bookedCount: true },
      orderBy: { startAt: "asc" },
    }),
    prisma.ticketBooking.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.ticketBooking.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { username: true, nickname: true } }, slot: { include: { ticketItem: { include: { venue: true } } } } },
    }),
  ]);

  const trend = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(date.getDate() + index);
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    const daily = slots.filter((slot) => slot.startAt >= date && slot.startAt < next);
    return {
      date: dayLabel(date),
      booked: daily.reduce((sum, slot) => sum + slot.bookedCount, 0),
      capacity: daily.reduce((sum, slot) => sum + slot.capacity, 0),
    };
  });
  const totalCapacity = slots.reduce((sum, slot) => sum + slot.capacity, 0);
  const totalBooked = slots.reduce((sum, slot) => sum + slot.bookedCount, 0);
  const occupancy = totalCapacity ? Math.round((totalBooked / totalCapacity) * 100) : 0;
  const statuses = statusGroups.map((group) => ({ name: statusLabels[group.status] ?? group.status, value: group._count._all }));
  const metrics = [
    { label: "开放场馆", value: venues, suffix: "处", hint: "当前正常运营", icon: Building2, tone: "green" },
    { label: "开放票务项目", value: tickets, suffix: "项", hint: "可被游客预约", icon: TicketCheck, tone: "red" },
    { label: "待核销预约", value: pendingBookings, suffix: "单", hint: "需要现场服务", icon: CalendarClock, tone: "amber" },
    { label: "未来七日上座率", value: occupancy, suffix: "%", hint: `${totalBooked} / ${totalCapacity} 人次`, icon: CircleGauge, tone: "teal" },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div><p>OPERATION OVERVIEW</p><h1>数据总览</h1><span>掌握票务运行状态、预约趋势与现场核销进度。</span></div>
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

      <AdminDashboardCharts trend={trend} statuses={statuses} />

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_.75fr]">
        <section className="admin-panel">
          <div className="admin-panel-heading"><div><p>LATEST BOOKINGS</p><h2>最新预约动态</h2></div><Link href="/admin/bookings">查看全部 <ArrowRight size={14}/></Link></div>
          <div className="admin-recent-list">
            {recentBookings.map((booking) => (
              <div key={booking.id}>
                <span className={`admin-status-dot ${booking.status.toLowerCase()}`} />
                <div><b>{booking.slot.ticketItem.title}</b><small>{booking.user.nickname || booking.user.username} · {booking.quantity} 人 · {booking.slot.ticketItem.venue.name}</small></div>
                <time>{new Date(booking.createdAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time>
                <em>{statusLabels[booking.status]}</em>
              </div>
            ))}
            {!recentBookings.length && <div className="admin-empty-row">暂无预约记录</div>}
          </div>
        </section>
        <section className="admin-panel admin-operation-panel">
          <div className="admin-panel-heading"><div><p>SERVICE STATUS</p><h2>运营状态</h2></div></div>
          <div className="admin-operation-score"><strong>{pendingBookings + verifiedBookings ? Math.round((verifiedBookings / (pendingBookings + verifiedBookings)) * 100) : 0}%</strong><span>预约核销完成率</span></div>
          <div className="admin-operation-lines"><p><span>票务服务</span><b><CheckCircle2 size={14}/>运行正常</b></p><p><span>未来开放时段</span><b>{slots.length} 个</b></p><p><span>真实支付</span><b className="muted">按需求未启用</b></p></div>
          <div className="mt-5 grid grid-cols-2 gap-3"><Link className="admin-quick-link primary" href="/admin/tickets">配置票务</Link><Link className="admin-quick-link" href="/admin/bookings">进入核销</Link></div>
        </section>
      </div>
    </div>
  );
}
