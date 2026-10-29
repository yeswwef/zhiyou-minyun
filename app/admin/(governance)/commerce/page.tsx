/**
 * @module-note app/admin/commerce/page.tsx
 * 平台管理中心：商户、商品与全平台订单总览。
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Store, Wallet } from "lucide-react";

type Merchant = {
  id: string; username: string; nickname: string | null; merchantName: string | null; createdAt: string;
  _count: { products: number; merchantOrders: number; studioWorks: number; experienceClasses: number };
};
type Product = {
  id: string; title: string; category: string; price: number; stock: number; unit: string | null; status: "PUBLISHED" | "DRAFT"; createdAt: string;
  merchant: { username: string; nickname: string | null; merchantName: string | null };
  _count: { orders: number };
};
type Order = {
  id: string; orderNo: string; status: string; quantity: number; amount: number; verifyCode: string; createdAt: string;
  product: { title: string; unit: string | null };
  merchant: { username: string; nickname: string | null; merchantName: string | null };
  buyer: { username: string; nickname: string | null };
};
type Stats = { merchants: number; products: number; orders: number; paidOrders: number; revenue: number };

const categoryLabels: Record<string, string> = { HOMESTAY: "民宿", DINING: "餐饮", HANDICRAFT: "非遗手作", SOUVENIR: "伴手礼", STUDYTOUR: "研学" };
const orderLabels: Record<string, string> = { PENDING: "待支付", PAID: "已支付", VERIFIED: "已核销", CANCELLED: "已取消" };
const tabs = [["merchants", "商户"], ["products", "商品"], ["orders", "订单"]] as const;

export default function AdminCommercePage() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats>({ merchants: 0, products: 0, orders: 0, paidOrders: 0, revenue: 0 });
  const [tab, setTab] = useState<"merchants" | "products" | "orders">("merchants");
  const [query, setQuery] = useState("");
  const [version, setVersion] = useState(0);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/commerce", { signal: controller.signal })
      .then((response) => response.json())
      .then((payload) => {
        setMerchants(payload.merchants ?? []);
        setProducts(payload.products ?? []);
        setOrders(payload.orders ?? []);
        setStats(payload.stats ?? { merchants: 0, products: 0, orders: 0, paidOrders: 0, revenue: 0 });
      })
      .catch(() => {});
    return () => controller.abort();
  }, [version]);

  const keyword = query.trim().toLowerCase();
  const visibleMerchants = useMemo(() => merchants.filter((item) => !keyword || `${item.username}${item.nickname ?? ""}${item.merchantName ?? ""}`.toLowerCase().includes(keyword)), [merchants, keyword]);
  const visibleProducts = useMemo(() => products.filter((item) => !keyword || `${item.title}${item.merchant.merchantName ?? ""}${categoryLabels[item.category] ?? ""}`.toLowerCase().includes(keyword)), [products, keyword]);
  const visibleOrders = useMemo(() => orders.filter((item) => !keyword || `${item.orderNo}${item.product.title}${item.buyer.nickname ?? ""}${item.buyer.username}`.toLowerCase().includes(keyword)), [orders, keyword]);

  async function toggleProduct(product: Product) {
    const next = product.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    const response = await fetch("/api/admin/commerce", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: product.id, status: next }),
    });
    const payload = await response.json();
    setMessage(payload.error ?? (next === "PUBLISHED" ? "商品已上架" : "商品已下架"));
    if (response.ok) setVersion((value) => value + 1);
  }

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div><p>MERCHANT &amp; COMMERCE</p><h1>商户与交易</h1><span>查看商户经营、商品上架状态与全平台订单，不介入商户线下核销。</span></div>
        <div className="admin-date"><Wallet size={16}/>成交额 ¥{Math.round(stats.revenue / 100).toLocaleString("zh-CN")}</div>
      </div>

      <div className="admin-mini-grid mb-5">
        <div className="admin-mini"><span>入驻商户</span><b>{stats.merchants}<small>家</small></b></div>
        <div className="admin-mini"><span>商品总数</span><b>{stats.products}<small>件</small></b></div>
        <div className="admin-mini"><span>已支付 / 核销订单</span><b>{stats.paidOrders}<small>笔</small></b></div>
        <div className="admin-mini"><span>累计成交额</span><b>¥{Math.round(stats.revenue / 100).toLocaleString("zh-CN")}</b></div>
      </div>

      <section className="admin-panel overflow-hidden p-0">
        <div className="admin-toolbar">
          <div className="admin-tabs">
            {tabs.map(([value, label]) => (
              <button key={value} className={`admin-tab ${tab === value ? "active" : ""}`} onClick={() => setTab(value)}>{label}</button>
            ))}
          </div>
          <label className="admin-search"><Search size={15}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索商户、商品或订单号"/></label>
        </div>
        {message && <p className="border-b border-[#eee5da] bg-[#fdf6f2] px-5 py-2 text-[11px] text-[#a3483b]">{message}</p>}

        <div className="overflow-x-auto">
          {tab === "merchants" && (
            <table className="admin-booking-table">
              <thead><tr><th>商户</th><th>店铺</th><th>商品</th><th>订单</th><th>作品 / 课程</th><th>入驻时间</th></tr></thead>
              <tbody>
                {visibleMerchants.map((merchant) => (
                  <tr key={merchant.id}>
                    <td><b>{merchant.nickname || merchant.username}</b><small>@{merchant.username}</small></td>
                    <td>{merchant.merchantName || "未设置店铺名"}</td>
                    <td>{merchant._count.products} 件</td>
                    <td>{merchant._count.merchantOrders} 笔</td>
                    <td>{merchant._count.studioWorks} 件作品 · {merchant._count.experienceClasses} 门课</td>
                    <td>{new Date(merchant.createdAt).toLocaleDateString("zh-CN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "products" && (
            <table className="admin-booking-table min-w-[1000px]">
              <thead><tr><th>商品</th><th>商户</th><th>分类 / 价格</th><th>库存</th><th>订单</th><th>状态</th><th>操作</th></tr></thead>
              <tbody>
                {visibleProducts.map((product) => (
                  <tr key={product.id}>
                    <td><b>{product.title}</b><small>{new Date(product.createdAt).toLocaleDateString("zh-CN")} 创建</small></td>
                    <td>{product.merchant.merchantName || product.merchant.nickname || product.merchant.username}</td>
                    <td>{categoryLabels[product.category] ?? product.category}<small>¥{(product.price / 100).toFixed(2)} / {product.unit || "份"}</small></td>
                    <td>{product.stock}</td>
                    <td>{product._count.orders} 笔</td>
                    <td><span className={`admin-role ${product.status === "PUBLISHED" ? "merchant" : "visitor"}`}>{product.status === "PUBLISHED" ? "在售" : "已下架"}</span></td>
                    <td><button className="admin-action" onClick={() => toggleProduct(product)}>{product.status === "PUBLISHED" ? "下架" : "上架"}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "orders" && (
            <table className="admin-booking-table min-w-[1050px]">
              <thead><tr><th>订单</th><th>买家 / 商户</th><th>数量 / 金额</th><th>履约方式</th><th>状态</th><th>下单时间</th></tr></thead>
              <tbody>
                {visibleOrders.map((order) => (
                  <tr key={order.id}>
                    <td><b>{order.product.title}</b><small>{order.orderNo}</small></td>
                    <td>{order.buyer.nickname || order.buyer.username}<small>{order.merchant.merchantName || order.merchant.username}</small></td>
                    <td>{order.quantity} {order.product.unit || "份"}<small>¥{(order.amount / 100).toFixed(2)}</small></td>
                    <td><small>顾客到店出示核销码</small></td>
                    <td><span className={`admin-booking-status ${order.status.toLowerCase()}`}>{orderLabels[order.status] ?? order.status}</span></td>
                    <td>{new Date(order.createdAt).toLocaleString("zh-CN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!((tab === "merchants" && visibleMerchants.length) || (tab === "products" && visibleProducts.length) || (tab === "orders" && visibleOrders.length)) && <p className="admin-empty">没有符合条件的记录</p>}
        </div>
      </section>

      <p className="mt-4 flex items-center gap-1.5 text-[10px] text-[#9a9289]"><Store size={12}/>订单核销仍由商户在商户端按顾客出示的核销码完成，平台仅做交易与履约监督。</p>
    </div>
  );
}
