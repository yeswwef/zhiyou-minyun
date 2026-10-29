/**
 * @module-note app/(c)/profile/orders/page.tsx
 * 游客端／用户中心／商品订单页面。客户端组件负责状态与交互，数据经接口获取；不要在此放服务端密钥。
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ORDER_STATUS_LABELS, formatPrice, type OrderDto } from "@/features/merchant/types";

const STATUS_TONE: Record<OrderDto["status"], string> = {
  PENDING: "text-earth",
  PAID: "text-brand",
  VERIFIED: "text-tea",
  CANCELLED: "text-stone-400",
};

/**
 * 渲染游客端／用户中心／商品订单界面及其子组件。
 * 接口协作：/api/orders、/api/orders/${order.id}。
 */
export default function MyOrdersPage() {
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(true);

  /**
   * 重新读取本页展示的数据并更新状态。
   * 接口协作：/api/orders。
   */
  function load() {
    fetch("/api/orders")
      .then((response) => response.json())
      .then((payload: { data?: OrderDto[]; loggedIn?: boolean }) => {
        setOrders(payload.data ?? []);
        setLoggedIn(payload.loggedIn !== false);
      })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  /**
   * 向订单接口提交支付模拟或取消动作并刷新列表。
   * 接口协作：/api/orders/${order.id}。
   * 输入：order、action；类型与可选项见函数签名。
   */
  async function act(order: OrderDto, action: "pay" | "cancel") {
    await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    load();
  }

  return (
    <>
      <div className="profile-page-head">
        <div>
          <h1>我的订单</h1>
          <p>文旅商城的订单都在这里，到店出示核销码即可。</p>
        </div>
        <Link href="/shop" className="profile-head-link">
          去商城逛逛
        </Link>
      </div>

      <div className="profile-page-body">
        {loading ? (
          <div className="profile-empty">正在加载订单……</div>
        ) : !loggedIn ? (
          <div className="profile-empty">
            请先 <Link href="/login">登录</Link> 后查看订单。
          </div>
        ) : orders.length ? (
          <div className="grid gap-3">
            {orders.map((order) => (
              <article
                key={order.id}
                className="flex flex-wrap items-center gap-4 border border-stone-200 bg-white p-4"
              >
                <div
                  className="h-16 w-16 shrink-0 bg-stone-100 bg-cover bg-center"
                  style={{
                    backgroundImage: `url('${order.product.image || "/images/sanfangqixiang.jpg"}')`,
                  }}
                />
                <div className="min-w-48 flex-1">
                  <p className="text-sm font-medium">{order.product.title}</p>
                  <p className="mt-1 font-mono text-[12.1px] text-stone-400">
                    {order.orderNo}
                  </p>
                </div>
                <div className="text-xs text-stone-500">
                  {order.quantity}
                  {order.product.unit ?? ""} · {formatPrice(order.amount)}
                </div>
                <div className={`text-xs ${STATUS_TONE[order.status]}`}>
                  {ORDER_STATUS_LABELS[order.status]}
                </div>
                {order.status === "PAID" && (
                  <div className="rounded bg-brand-soft px-2 py-1 text-xs text-brand">
                    核销码 <span className="font-mono">{order.verifyCode}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  {order.status === "PENDING" && (
                    <>
                      <button className="btn py-1.5 text-xs" onClick={() => act(order, "pay")}>
                        模拟支付
                      </button>
                      <button
                        className="btn-ghost py-1.5 text-xs"
                        onClick={() => act(order, "cancel")}
                      >
                        取消
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="profile-empty">还没有订单，去商城看看有什么喜欢的吧。</div>
        )}
      </div>
    </>
  );
}
