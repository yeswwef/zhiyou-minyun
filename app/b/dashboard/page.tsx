/**
 * @module-note app/b/dashboard/page.tsx
 * 商户端／数据总览页面。沿用票务中心的后台视觉语言，趋势改为折线图。
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ClipboardCheck,
  Clock3,
  GraduationCap,
  Package,
  ReceiptText,
  Wallet,
} from "lucide-react";

type Dashboard = {
  summary: {
    productTotal: number;
    productPublished: number;
    orderTotal: number;
    orderByStatus: { PENDING: number; PAID: number; VERIFIED: number; CANCELLED: number };
    revenueYuan: number;
    enrollmentTotal: number;
    enrollmentPending: number;
    workTotal: number;
    classTotal: number;
  };
  trend: Array<{ label: string; orders: number; revenueYuan: number; enrollments: number }>;
  profile: {
    tiers: Array<{ label: string; count: number }>;
    categories: Array<{ label: string; count: number }>;
    topBuyers: Array<{ name: string; orders: number; amountYuan: number }>;
  };
};

const CHART_WIDTH = 760;
const CHART_HEIGHT = 250;
const PAD = { left: 36, right: 20, top: 22, bottom: 38 };
const INNER_WIDTH = CHART_WIDTH - PAD.left - PAD.right;
const INNER_HEIGHT = CHART_HEIGHT - PAD.top - PAD.bottom;

/**
 * 渲染商户端／数据总览界面及其子组件。
 * 接口协作：/api/merchant/dashboard。
 */
export default function MerchantDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/merchant/dashboard")
      .then(async (response) => {
        if (response.status === 401) throw new Error("请先登录商户端账号");
        return response.json() as Promise<Dashboard>;
      })
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div className="admin-panel py-12 text-center text-sm text-stone-500">
        {error}
        <Link href="/login" className="ml-2 text-[#b84434]">
          去登录
        </Link>
      </div>
    );
  }

  if (!data) {
    return <div className="admin-panel py-12 text-center text-sm text-stone-500">正在加载看板数据……</div>;
  }

  const { summary, trend, profile } = data;
  const maxCategory = Math.max(1, ...profile.categories.map((item) => item.count));
  const maxTier = Math.max(1, ...profile.tiers.map((item) => item.count));
  const maxValue = Math.max(1, ...trend.flatMap((day) => [day.orders, day.enrollments]));
  const chartMax = Math.max(4, Math.ceil(maxValue / 4) * 4);
  const totalOrders = trend.reduce((sum, day) => sum + day.orders, 0);
  const totalEnrollments = trend.reduce((sum, day) => sum + day.enrollments, 0);
  const totalRevenue = trend.reduce((sum, day) => sum + day.revenueYuan, 0);

  const xAt = (index: number) => PAD.left + (trend.length > 1 ? (INNER_WIDTH / (trend.length - 1)) * index : 0);
  const yAt = (value: number) => PAD.top + INNER_HEIGHT - (value / chartMax) * INNER_HEIGHT;
  const linePath = (key: "orders" | "enrollments") =>
    trend.map((day, index) => `${index ? "L" : "M"}${xAt(index)},${yAt(day[key])}`).join(" ");
  const areaPath = `${linePath("orders")} L${xAt(trend.length - 1)},${PAD.top + INNER_HEIGHT} L${xAt(0)},${PAD.top + INNER_HEIGHT} Z`;
  const ticks = Array.from({ length: 5 }, (_, index) => (chartMax / 4) * index);

  const kpis = [
    {
      label: "在售商品",
      value: summary.productPublished,
      suffix: "件",
      hint: `共 ${summary.productTotal} 件商品`,
      icon: Package,
      tone: "green",
    },
    {
      label: "订单总数",
      value: summary.orderTotal,
      suffix: "单",
      hint: `待支付 ${summary.orderByStatus.PENDING}`,
      icon: ReceiptText,
      tone: "red",
    },
    {
      label: "成交额",
      value: `¥${summary.revenueYuan.toLocaleString("zh-CN")}`,
      suffix: "",
      hint: `已核销 ${summary.orderByStatus.VERIFIED}`,
      icon: Wallet,
      tone: "amber",
    },
    {
      label: "待核销",
      value: summary.orderByStatus.PAID,
      suffix: "单",
      hint: "已支付待核销",
      icon: ClipboardCheck,
      tone: "teal",
    },
    {
      label: "体验课报名",
      value: summary.enrollmentTotal,
      suffix: "人",
      hint: `待确认 ${summary.enrollmentPending}`,
      icon: GraduationCap,
      tone: "plum",
    },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <p>MERCHANT OVERVIEW</p>
          <h1>经营看板</h1>
          <span>掌握商品、订单与体验课的经营态势，读懂来店游客的偏好。</span>
        </div>
        <div className="admin-date">
          <Clock3 size={16} />
          <span>{new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}</span>
        </div>
      </div>

      <div className="admin-metric-grid merchant-metric-grid">
        {kpis.map(({ label, value, suffix, hint, icon: Icon, tone }) => (
          <section className={`admin-metric ${tone}`} key={label}>
            <div>
              <p>{label}</p>
              <strong>{value}<small>{suffix}</small></strong>
              <span>{hint}</span>
            </div>
            <i><Icon size={22} /></i>
          </section>
        ))}
      </div>

      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <p>TRAFFIC TREND</p>
            <h2>近 7 天客流趋势</h2>
          </div>
          <div className="admin-chart-legend">
            <span className="booked">每日订单</span>
            <span className="enrolled">体验课报名</span>
          </div>
        </div>

        <div className="merchant-chart">
          <svg
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            role="img"
            aria-label={`近 7 天订单 ${totalOrders} 单，体验课报名 ${totalEnrollments} 人`}
          >
            <defs>
              <linearGradient id="trend-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#b84434" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#b84434" stopOpacity="0" />
              </linearGradient>
            </defs>

            {ticks.map((tick) => (
              <g key={tick}>
                <line
                  x1={PAD.left}
                  x2={CHART_WIDTH - PAD.right}
                  y1={yAt(tick)}
                  y2={yAt(tick)}
                  className="merchant-chart-gridline"
                />
                <text x={PAD.left - 10} y={yAt(tick) + 4} textAnchor="end" className="merchant-chart-axis">
                  {Math.round(tick)}
                </text>
              </g>
            ))}

            <path d={areaPath} fill="url(#trend-area)" />
            <path d={linePath("orders")} className="merchant-chart-line orders" />
            <path d={linePath("enrollments")} className="merchant-chart-line enrollments" />

            {trend.map((day, index) => (
              <g key={day.label}>
                <text x={xAt(index)} y={CHART_HEIGHT - 12} textAnchor="middle" className="merchant-chart-axis">
                  {day.label}
                </text>
                <g className="merchant-chart-point">
                  <circle cx={xAt(index)} cy={yAt(day.orders)} r="8" className="merchant-chart-hit" />
                  <circle cx={xAt(index)} cy={yAt(day.orders)} r="4" className="merchant-chart-dot orders" />
                  <title>{`${day.label} · 订单 ${day.orders} 单 · 成交 ¥${day.revenueYuan}`}</title>
                </g>
                <g className="merchant-chart-point">
                  <circle cx={xAt(index)} cy={yAt(day.enrollments)} r="8" className="merchant-chart-hit" />
                  <circle cx={xAt(index)} cy={yAt(day.enrollments)} r="3.4" className="merchant-chart-dot enrollments" />
                  <title>{`${day.label} · 体验课报名 ${day.enrollments} 人`}</title>
                </g>
              </g>
            ))}
          </svg>
          <p className="admin-chart-note">
            近 7 天合计 {totalOrders} 单 · 报名 {totalEnrollments} 人 · 成交 ¥{totalRevenue.toLocaleString("zh-CN")}
          </p>
        </div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div><p>SPENDING TIERS</p><h2>游客消费档位</h2></div>
            <span className="admin-panel-total">{summary.orderTotal} 单</span>
          </div>
          <div className="merchant-bars">
            {profile.tiers.map((tier) => (
              <div key={tier.label}>
                <div className="merchant-bar-label"><span>{tier.label}</span><b>{tier.count} 人</b></div>
                <div className="merchant-bar-track">
                  <div
                    className="merchant-bar-fill earth"
                    style={{ width: `${(tier.count / maxTier) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div><p>CATEGORY PREFERENCE</p><h2>游客类别偏好</h2></div>
          </div>
          {profile.categories.length ? (
            <div className="merchant-bars">
              {profile.categories.map((item) => (
                <div key={item.label}>
                  <div className="merchant-bar-label"><span>{item.label}</span><b>{item.count} 单</b></div>
                  <div className="merchant-bar-track">
                    <div
                      className="merchant-bar-fill sea"
                      style={{ width: `${(item.count / maxCategory) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="admin-empty-row">暂无订单数据</p>
          )}
        </section>

        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div><p>TOP VISITORS</p><h2>活跃游客 Top 5</h2></div>
          </div>
          {profile.topBuyers.length ? (
            <div className="merchant-visitor-list">
              {profile.topBuyers.map((buyer, index) => (
                <div key={buyer.name}>
                  <span className="merchant-rank">{String(index + 1).padStart(2, "0")}</span>
                  <div><b>{buyer.name}</b><small>{buyer.orders} 笔订单</small></div>
                  <strong>¥{buyer.amountYuan.toLocaleString("zh-CN")}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="admin-empty-row">暂无消费数据</p>
          )}
        </section>
      </div>
    </div>
  );
}
