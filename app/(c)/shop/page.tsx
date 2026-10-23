/**
 * @module-note app/(c)/shop/page.tsx
 * 游客端／商城页面。客户端组件负责状态与交互，数据经接口获取；不要在此放服务端密钥。
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Store, X } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import {
  PRODUCT_CATEGORIES,
  formatPrice,
  productCategoryLabel,
  type ProductDto,
} from "@/features/merchant/types";

type Filter = "ALL" | (typeof PRODUCT_CATEGORIES)[number]["value"];

/**
 * 渲染游客端／商城界面及其子组件。
 * 接口协作：/api/shop/products?${query.toString()}。
 */
export default function ShopPage() {
  const [category, setCategory] = useState<Filter>("ALL");
  const [keyword, setKeyword] = useState("");
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const query = new URLSearchParams();
    if (category !== "ALL") query.set("category", category);
    if (keyword.trim()) query.set("q", keyword.trim());

    fetch(`/api/shop/products?${query.toString()}`)
      .then((response) => response.json())
      .then((payload: { data?: ProductDto[] }) => setProducts(payload.data ?? []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [category, keyword]);

  return (
    <main className="resource-page">
      <header className="resource-site-nav">
        <Link href="/home" className="resource-brand">
          <span><BrandMark size={19} /></span>
          <strong>智游闽韵</strong>
          <small>FUZHOU TRAVEL</small>
        </Link>
        <nav>
          <Link href="/resources">发现</Link>
          <Link className="active" href="/shop">商城</Link>
          <Link href="/learn">非遗学习</Link>
          <Link href="/profile/orders">我的订单</Link>
        </nav>
        <Link href="/home" className="resource-user">返回首页</Link>
      </header>

      <header className="resource-header">
        <div>
          <p className="section-kicker">LOCAL GOODS &amp; EXPERIENCE</p>
          <h1>文旅商城</h1>
          <p>民宿、餐饮、非遗手作、伴手礼与研学体验，把福州带回家。</p>
        </div>
        <Link href="/learn" className="resource-back">
          看非遗体验课
        </Link>
      </header>

      <section className="resource-toolbar">
        <div className="resource-search">
          <Search size={18} />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索商品、地点"
          />
        </div>
        <div className="resource-filter-row">
          <div className="category-tabs">
            <button
              className={category === "ALL" ? "selected" : ""}
              onClick={() => setCategory("ALL")}
            >
              全部
            </button>
            {PRODUCT_CATEGORIES.map((item) => (
              <button
                key={item.value}
                className={category === item.value ? "selected" : ""}
                onClick={() => setCategory(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
          {(keyword || category !== "ALL") && (
            <button
              className="clear-filter"
              onClick={() => {
                setKeyword("");
                setCategory("ALL");
              }}
            >
              <X size={14} /> 清除筛选
            </button>
          )}
        </div>
      </section>

      <section className="resource-results">
        <div className="resource-result-heading">
          <h2>在售商品</h2>
          <span>共 {products.length} 件</span>
        </div>

        {loading ? (
          <div className="resource-empty">正在加载商品……</div>
        ) : products.length ? (
          <div className="resource-grid">
            {products.map((product) => (
              <Link className="resource-card" href={`/shop/${product.id}`} key={product.id}>
                <div
                  className="resource-card-image"
                  style={{
                    backgroundImage: `url('${product.image || "/images/sanfangqixiang.jpg"}')`,
                  }}
                />
                <div className="resource-card-body">
                  <div className="resource-card-top">
                    <span className="resource-category">
                      {productCategoryLabel(product.category)}
                    </span>
                    <span className="resource-district">
                      {product.location || "福州"}
                    </span>
                  </div>
                  <h3>{product.title}</h3>
                  <p>{product.summary}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-semibold text-brand">
                      {formatPrice(product.price)}
                      <span className="ml-1 text-xs text-stone-400">
                        /{product.unit || "份"}
                      </span>
                    </span>
                    <span className="text-[11px] text-stone-400">
                      余 {product.stock}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="resource-empty">
            <Store size={28} className="mx-auto mb-3 text-stone-300" />
            还没有商品，等商户上架后来逛逛吧。
          </div>
        )}
      </section>
    </main>
  );
}
