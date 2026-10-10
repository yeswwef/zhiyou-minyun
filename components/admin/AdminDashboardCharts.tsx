"use client";

import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type TrendPoint = { date: string; booked: number; capacity: number };
type PiePoint = { name: string; value: number };

const PIE_COLORS = ["#b84434", "#d99b53", "#315f58", "#a7aaa3"];

export function AdminDashboardCharts({
  trend,
  statuses,
}: {
  trend: TrendPoint[];
  statuses: PiePoint[];
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.55fr_.85fr]">
      <section className="admin-panel min-w-0">
        <div className="admin-panel-heading">
          <div><p>CAPACITY TREND</p><h2>未来 7 天预约承载趋势</h2></div>
          <div className="admin-chart-legend"><span className="booked">已预约人数</span><span className="capacity">开放容量</span></div>
        </div>
        <div className="h-[310px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 18, right: 20, left: -12, bottom: 4 }}>
              <CartesianGrid stroke="#eee6dc" strokeDasharray="4 5" vertical={false} />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#837b72", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#837b72", fontSize: 12 }} />
              <Tooltip contentStyle={{ border: "1px solid #e8ddd0", borderRadius: 10, background: "#fffdf9" }} />
              <Line type="monotone" dataKey="capacity" name="开放容量" stroke="#315f58" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="booked" name="已预约人数" stroke="#b84434" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="admin-panel min-w-0">
        <div className="admin-panel-heading"><div><p>BOOKING STATUS</p><h2>预约状态构成</h2></div></div>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={statuses} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={3}>
                {statuses.map((item, index) => <Cell key={item.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ border: "1px solid #e8ddd0", borderRadius: 10, background: "#fffdf9" }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <p className="admin-chart-note">统计口径：当前数据库全部票务预约记录</p>
      </section>
    </div>
  );
}
