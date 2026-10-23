/**
 * @module-note app/(c)/shop/[id]/page.tsx
 * 游客端／商城／指定id页面。客户端组件负责状态与交互，数据经接口获取；不要在此放服务端密钥。
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Package, Store } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import {
  ORDER_STATUS_LABELS,
  formatPrice,
  productCategoryLabel,
  type OrderDto,
  type ProductDto,
} from "@/features/merchant/types";

/**
 * 渲染游客端／商城／指定id界面及其子组件。
 * 接口协作：/api/shop/products/${params.id}、/api/orders、/api/orders/${order.id}。
 */
export default function ShopProductPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<ProductDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [contact, setContact] = useState("");
  const [remark, setRemark] = useState("");
  const [order, setOrder] = useState<OrderDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/shop/products/${params.id}`)
      .then(async (response) => {
        const payload = (await response.json()) as { item?: ProductDto; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "加载失败");
        setProduct(payload.item ?? null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  /**
   * 为当前商品创建订单并进入待支付流程。
   * 接口协作：/api/orders。
   */
  async function createOrder() {
    setBusy(true);
    setError("");
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: params.id, quantity, contact, remark }),
    });
    const payload = (await response.json()) as { item?: OrderDto; error?: string };
    setBusy(false);

    if (response.status === 401) {
      router.push("/login");
      return;
    }
    if (!response.ok) {
      setError(payload.error ?? "下单失败");
      return;
    }
    setOrder(payload.item ?? null);
  }

  /**
   * 提交本地模拟支付动作；不是第三方真实扣款。
   * 接口协作：/api/orders/${order.id}。
   */
  async function pay() {
    if (!order) return;
    setBusy(true);
    const response = await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pay" }),
    });
    const payload = (await response.json()) as { item?: OrderDto; error?: string };
    setBusy(false);
    if (response.ok && payload.item) setOrder(payload.item);
  }

  return (
    <main className="resource-detail-page">
      <header className="resource-site-nav">
        <Link href="/home" className="resource-brand">
          <span><BrandMark size={19} /></span>
          <strong>智游闽韵</strong>
          <small>FUZHOU TRAVEL</small>
        </Link>
        <nav>
          <Link href="/shop">商城</Link>
          <Link href="/learn">非遗学习</Link>
          <Link href="/profile/orders">我的订单</Link>
        </nav>
        <Link href="/shop" className="resource-user">返回商城</Link>
      </header>

      <Link className="detail-back" href="/shop">
        <ArrowLeft size={16} /> 返回商城
      </Link>

      {loading ? (
        <div className="mx-auto w-[min(1200px,calc(100%-48px))]">
          <div className="resource-empty">正在加载商品……</div>
        </div>
      ) : !product ? (
        <div className="mx-auto w-[min(1200px,calc(100%-48px))]">
          <div className="resource-empty">{error || "商品不存在或已下架"}</div>
        </div>
      ) : (
        <>
          <div
            className="detail-hero"
            style={{
              backgroundImage: `url('${product.image || "/images/sanfangqixiang.jpg"}')`,
            }}
          >
            <div className="detail-hero-shade" />
            <div className="detail-hero-copy">
              <span>
                {productCategoryLabel(product.category)} · {product.merchant.merchantName || product.merchant.username}
              </span>
              <h1>{product.title}</h1>
              <p>{product.summary}</p>
            </div>
          </div>

          <div className="detail-layout">
            <article className="detail-content">
              <section>
                <p className="section-kicker">ABOUT</p>
                <h2>商品介绍</h2>
                <p>{product.description || product.summary}</p>
              </section>

              <section>
                <p className="section-kicker">ORDER</p>
                <h2>立即下单</h2>

                {order ? (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-stone-200 bg-white p-4 text-sm">
                      <p>
                        订单号：<span className="font-mono text-xs">{order.orderNo}</span>
                      </p>
                      <p className="mt-2">
                        状态：
                        <span className="text-brand">{ORDER_STATUS_LABELS[order.status]}</span>
                      </p>
                      <p className="mt-2">
                        金额：<span className="font-semibold">{formatPrice(order.amount)}</span>
                      </p>
                      {order.status === "PAID" && (
                        <p className="mt-3 rounded-md bg-brand-soft px-3 py-2 text-brand">
                          核销码：<span className="font-mono text-lg">{order.verifyCode}</span>
                          <span className="ml-2 text-xs">到店出示即可核销</span>
                        </p>
                      )}
                    </div>

                    <div className="flex gap-3">
                      {order.status === "PENDING" && (
                        <button className="btn" onClick={pay} disabled={busy}>
                          {busy ? "支付中……" : "模拟支付"}
                        </button>
                      )}
                      <Link className="btn-ghost" href="/profile/orders">
                        查看我的订单
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <label className="text-sm text-stone-600">数量</label>
                      <input
                        className="input max-w-24"
                        value={quantity}
                        onChange={(event) => setQuantity(Number(event.target.value) || 1)}
                        inputMode="numeric"
                      />
                      <span className="text-sm text-stone-400">
                        {formatPrice(product.price * (quantity || 1))}
                      </span>
                    </div>
                    <input
                      className="input"
                      value={contact}
                      onChange={(event) => setContact(event.target.value)}
                      placeholder="联系方式（手机号，可选）"
                    />
                    <input
                      className="input"
                      value={remark}
                      onChange={(event) => setRemark(event.target.value)}
                      placeholder="备注（可选）"
                    />
                    {error && <p className="text-sm text-brand">{error}</p>}
                    <button
                      className="btn"
                      onClick={createOrder}
                      disabled={busy || product.stock <= 0}
                    >
                      {product.stock <= 0 ? "库存不足" : busy ? "提交中……" : "提交订单"}
                    </button>
                  </div>
                )}
              </section>
            </article>

            <aside className="detail-facts">
              <h2>商品信息</h2>
              <div>
                <Package size={18} />
                <span>
                  <b>价格</b>
                  {formatPrice(product.price)} / {product.unit || "份"}
                </span>
              </div>
              <div>
                <Store size={18} />
                <span>
                  <b>商户</b>
                  {product.merchant.merchantName || product.merchant.nickname || product.merchant.username}
                </span>
              </div>
              <div>
                <MapPin size={18} />
                <span>
                  <b>地点</b>
                  {product.location || "福州市"}
                </span>
              </div>
              <div>
                <span className="fact-dot" />
                <span>
                  <b>库存</b>
                  剩余 {product.stock} {product.unit || "份"}
                </span>
              </div>
            </aside>
          </div>
        </>
      )}
    </main>
  );
}
