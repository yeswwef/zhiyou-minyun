/**
 * @module-note app/b/orders/page.tsx
 * 商户端／商品订单页面。客户端组件负责状态与交互，数据经接口获取；不要在此放服务端密钥。
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, XCircle } from "lucide-react";
import {
  ORDER_STATUS_LABELS,
  formatPrice,
  type MerchantOrderDto,
  type OrderStatusValue,
} from "@/features/merchant/types";

const FILTERS: Array<{ value: "ALL" | OrderStatusValue; label: string }> = [
  { value: "ALL", label: "全部" },
  { value: "PENDING", label: "待支付" },
  { value: "PAID", label: "待核销" },
  { value: "VERIFIED", label: "已核销" },
  { value: "CANCELLED", label: "已取消" },
];

const STATUS_TONE: Record<OrderStatusValue, string> = {
  PENDING: "text-earth",
  PAID: "text-brand",
  VERIFIED: "text-tea",
  CANCELLED: "text-stone-400",
};

/**
 * 渲染商户端／商品订单界面及其子组件。
 * 接口协作：/api/merchant/orders?${query.toString()}、/api/merchant/orders/verify、/api/merchant/orders/${order.id}。
 */
export default function MerchantOrdersPage() {
  const [orders, setOrders] = useState<MerchantOrderDto[]>([]);
  const [status, setStatus] = useState<"ALL" | OrderStatusValue>("ALL");
  const [keyword, setKeyword] = useState("");
  const [error, setError] = useState("");

  const [code, setCode] = useState("");
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [verifyOk, setVerifyOk] = useState("");

  const load = useCallback(() => {
    const query = new URLSearchParams();
    if (status !== "ALL") query.set("status", status);
    if (keyword.trim()) query.set("q", keyword.trim());
    fetch(`/api/merchant/orders?${query.toString()}`)
      .then((response) => response.json())
      .then((payload: { data?: MerchantOrderDto[]; error?: string }) => {
        if (payload.error) throw new Error(payload.error);
        setOrders(payload.data ?? []);
      })
      .catch((err: Error) => setError(err.message));
  }, [status, keyword]);

  useEffect(load, [load]);

  /**
   * 提交用户提供的核销码并显示核销结果。
   * 接口协作：/api/merchant/orders/verify。
   */
  async function verify() {
    setVerifyBusy(true);
    setVerifyError("");
    setVerifyOk("");

    const response = await fetch("/api/merchant/orders/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const payload = (await response.json()) as {
      item?: MerchantOrderDto;
      error?: string;
    };
    setVerifyBusy(false);

    if (!response.ok || !payload.item) {
      setVerifyError(payload.error ?? "核销失败");
      return;
    }
    setVerifyOk(
      `核销成功：${payload.item.orderNo} · ${payload.item.product.title} · ${
        payload.item.buyer.nickname || payload.item.buyer.username
      }`,
    );
    setCode("");
    load();
  }

  /**
   * 取消选中订单并同步列表状态。
   * 接口协作：/api/merchant/orders/${order.id}。
   * 输入：order；类型与可选项见函数签名。
   */
  async function cancelOrder(order: MerchantOrderDto) {
    const response = await fetch(`/api/merchant/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "操作失败");
      return;
    }
    setError("");
    load();
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">订单核销</h1>
        <p className="mt-1 text-xs text-stone-500">
          顾客到店后出示订单核销码，在下方输入即可核销（商户端不显示核销码）
        </p>
      </div>

      <section className="rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <KeyRound size={16} className="text-brand" /> 输入核销码
        </h2>
        <p className="mt-1 text-xs text-stone-500">请向顾客索取 6 位核销码后输入</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            className="input max-w-48 font-mono tracking-[0.3em]"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="6 位数字"
            inputMode="numeric"
          />
          <button
            className="btn"
            onClick={verify}
            disabled={verifyBusy || code.length < 4}
          >
            {verifyBusy ? "核销中……" : "核销"}
          </button>
        </div>
        {verifyError && <p className="mt-3 text-xs text-brand">{verifyError}</p>}
        {verifyOk && <p className="mt-3 text-xs text-tea">{verifyOk}</p>}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              onClick={() => setStatus(item.value)}
              className={`rounded-lg px-3 py-1.5 text-xs transition ${
                status === item.value
                  ? "bg-brand text-white"
                  : "bg-white text-stone-600 hover:bg-stone-100"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <input
          className="input ml-auto max-w-xs"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="搜索订单号或商品名"
        />
      </div>

      {error && <p className="text-xs text-brand">{error}</p>}

      {orders.length ? (
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="w-full min-w-[46rem] text-xs">
            <thead className="bg-stone-50 text-stone-500">
              <tr>
                <th className="px-4 py-3 text-left font-normal">订单号</th>
                <th className="px-4 py-3 text-left font-normal">商品</th>
                <th className="px-4 py-3 text-left font-normal">买家</th>
                <th className="px-4 py-3 text-right font-normal">数量</th>
                <th className="px-4 py-3 text-right font-normal">金额</th>
                <th className="px-4 py-3 text-center font-normal">状态</th>
                <th className="px-4 py-3 text-right font-normal">操作</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-stone-100">
                  <td className="px-4 py-3 font-mono text-[12.1px] text-stone-500">
                    {order.orderNo}
                  </td>
                  <td className="px-4 py-3">{order.product.title}</td>
                  <td className="px-4 py-3 text-stone-500">
                    {order.buyer.nickname || order.buyer.username}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {order.quantity}
                    {order.product.unit ?? ""}
                  </td>
                  <td className="px-4 py-3 text-right">{formatPrice(order.amount)}</td>
                  <td className={`px-4 py-3 text-center ${STATUS_TONE[order.status]}`}>
                    {ORDER_STATUS_LABELS[order.status]}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {order.status === "PENDING" && (
                        <button
                          className="btn-ghost inline-flex items-center gap-1 py-1 text-xs text-brand"
                          onClick={() => cancelOrder(order)}
                        >
                          <XCircle size={13} /> 取消
                        </button>
                      )}
                      {order.status === "PAID" && (
                        <span className="text-stone-400">待顾客出示核销码</span>
                      )}
                      {(order.status === "VERIFIED" || order.status === "CANCELLED") && (
                        <span className="text-stone-300">已结束</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center text-sm text-stone-400">
          暂无订单。等游客在 C 端商城下单后，这里就会出现订单。
        </div>
      )}
    </div>
  );
}
