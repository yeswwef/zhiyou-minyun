/**
 * @module-note components/admin/AdminDashboardCharts.tsx
 * 平台总览图表：近 7 日活跃趋势与用户角色构成。
 */
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

type TrendPoint = { date: string; users: number; posts: number; orders: number };
type PiePoint = { name: string; value: number };

const PIE_COLORS = ["#315f58", "#b84434", "#d99b53", "#7b6a9a"];

/** 渲染平台总览的趋势折线图与角色构成环图。 */
export function AdminDashboardCharts({ trend, roles }: { trend: TrendPoint[]; roles: PiePoint[] }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.55fr_.85fr]">
      <section className="admin-panel min-w-0">
        <div className="admin-panel-heading">
          <div><p>PLATFORM ACTIVITY</p><h2>近 7 日平台活跃趋势</h2></div>
          <div className="admin-chart-legend">
            <span className="users">新增用户</span><span className="posts">社区内容</span><span className="orders">商城订单</span>
          </div>
        </div>
        <div className="h-[310px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 18, right: 20, left: -12, bottom: 4 }}>
              <CartesianGrid stroke="#eee6dc" strokeDasharray="4 5" vertical={false} />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#837b72", fontSize: 12 }} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#837b72", fontSize: 12 }} />
              <Tooltip contentStyle={{ border: "1px solid #e8ddd0", borderRadius: 10, background: "#fffdf9" }} />
              <Line type="monotone" dataKey="users" name="新增用户" stroke="#b84434" strokeWidth={3} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="posts" name="社区内容" stroke="#315f58" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="orders" name="商城订单" stroke="#d99b53" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="admin-panel min-w-0">
        <div className="admin-panel-heading"><div><p>ACCOUNT MIX</p><h2>用户角色构成</h2></div></div>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={roles} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={3}>
                {roles.map((item, index) => <Cell key={item.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ border: "1px solid #e8ddd0", borderRadius: 10, background: "#fffdf9" }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <p className="admin-chart-note">统计口径：当前数据库全部注册账号</p>
      </section>
    </div>
  );
}
