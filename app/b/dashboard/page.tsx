/**
 * @module-note app/b/dashboard/page.tsx
 * 商户端／数据总览页面。客户端组件负责状态与交互，数据经接口获取；不要在此放服务端密钥。
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
      <div className="rounded-xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-500">
        {error}　
        <Link href="/login" className="text-brand">
          去登录
        </Link>
      </div>
    );
  }

  if (!data) {
    return <div className="text-sm text-stone-500">正在加载看板数据……</div>;
  }

  const { summary, trend, profile } = data;
  const maxOrders = Math.max(1, ...trend.map((day) => day.orders));
  const maxCategory = Math.max(1, ...profile.categories.map((item) => item.count));
  const maxTier = Math.max(1, ...profile.tiers.map((item) => item.count));

  const kpis = [
    { label: "在售商品", value: summary.productPublished, hint: `共 ${summary.productTotal} 件` },
    { label: "订单总数", value: summary.orderTotal, hint: `待支付 ${summary.orderByStatus.PENDING}` },
    { label: "成交额", value: `¥${summary.revenueYuan}`, hint: `已核销 ${summary.orderByStatus.VERIFIED}` },
    { label: "待核销", value: summary.orderByStatus.PAID, hint: "已支付待核销" },
    { label: "体验课报名", value: summary.enrollmentTotal, hint: `待确认 ${summary.enrollmentPending}` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">经营看板</h1>
        <p className="mt-1 text-xs text-stone-500">
          客流数据与游客画像（数据来自你名下商品订单与体验课报名）
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {kpis.map((item) => (
          <div key={item.label} className="rounded-xl border border-stone-200 bg-white p-4">
            <p className="text-xs text-stone-500">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold text-brand">{item.value}</p>
            <p className="mt-1 text-[11px] text-stone-400">{item.hint}</p>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-semibold">近 7 天客流趋势</h2>
        <p className="mt-1 text-xs text-stone-500">柱子高度代表当天订单数，圆点为体验课报名</p>
        <div className="mt-5 flex items-end gap-3">
          {trend.map((day) => (
            <div key={day.label} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-[11px] text-stone-400">{day.orders}</span>
              <div className="flex h-32 w-full items-end justify-center">
                <div
                  className="w-8 rounded-t bg-brand/80"
                  style={{ height: `${Math.max(4, (day.orders / maxOrders) * 100)}%` }}
                  title={`订单 ${day.orders} · 成交 ¥${day.revenueYuan}`}
                />
              </div>
              <span className="text-[11px] text-stone-500">{day.label}</span>
              <span className="text-[11px] text-sea">● {day.enrollments}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <section className="rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="text-sm font-semibold">游客消费档位</h2>
          <div className="mt-4 space-y-3">
            {profile.tiers.map((tier) => (
              <div key={tier.label}>
                <div className="flex justify-between text-xs text-stone-500">
                  <span>{tier.label}</span>
                  <span>{tier.count} 人</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-stone-100">
                  <div
                    className="h-2 rounded-full bg-earth"
                    style={{ width: `${(tier.count / maxTier) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="text-sm font-semibold">游客类别偏好</h2>
          {profile.categories.length ? (
            <div className="mt-4 space-y-3">
              {profile.categories.map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs text-stone-500">
                    <span>{item.label}</span>
                    <span>{item.count} 单</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-stone-100">
                    <div
                      className="h-2 rounded-full bg-sea"
                      style={{ width: `${(item.count / maxCategory) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-xs text-stone-400">暂无订单数据</p>
          )}
        </section>

        <section className="rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="text-sm font-semibold">活跃游客 Top 5</h2>
          {profile.topBuyers.length ? (
            <table className="mt-4 w-full text-xs">
              <thead className="text-stone-400">
                <tr>
                  <th className="text-left font-normal">游客</th>
                  <th className="text-right font-normal">订单</th>
                  <th className="text-right font-normal">消费</th>
                </tr>
              </thead>
              <tbody>
                {profile.topBuyers.map((buyer) => (
                  <tr key={buyer.name} className="border-t border-stone-100">
                    <td className="py-2">{buyer.name}</td>
                    <td className="py-2 text-right">{buyer.orders}</td>
                    <td className="py-2 text-right">¥{buyer.amountYuan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mt-4 text-xs text-stone-400">暂无消费数据</p>
          )}
        </section>
      </div>
    </div>
  );
}
