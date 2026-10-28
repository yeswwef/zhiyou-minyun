/**
 * @module-note app/(c)/shop/page.tsx
 * 游客端／商城页面：把民宿、餐饮、手作与研学做成一张可逛的「福州好物」目录。
 * 数据一次取回后在前端筛选，避免切换分类时丢失其他分类的数量。
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search, Store, X } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import {
  PRODUCT_CATEGORIES,
  formatPrice,
  productCategoryLabel,
  type ProductDto,
} from "@/features/merchant/types";
import styles from "@/features/commerce/commerce.module.css";

type Filter = "ALL" | (typeof PRODUCT_CATEGORIES)[number]["value"];
type Sort = "featured" | "price-asc" | "price-desc" | "stock";

const SECTIONS = [
  {
    value: "HOMESTAY" as const,
    index: "01",
    kicker: "STAY IN THE ALLEYS",
    title: "住进坊巷",
    description: "古厝、山居与江景公寓，把夜晚也留在福州。",
  },
  {
    value: "DINING" as const,
    index: "02",
    kicker: "A BITE OF FUZHOU",
    title: "吃一顿福州",
    description: "鱼丸、锅边糊、荔枝肉与佛跳墙，从早餐吃到夜宵。",
  },
  {
    value: "HANDICRAFT" as const,
    index: "03",
    kicker: "MADE BY HAND",
    title: "带走一门手艺",
    description: "寿山石、脱胎漆器、软木画，都是可以带回家的福州。",
  },
  {
    value: "SOUVENIR" as const,
    index: "04",
    kicker: "TAKE FUZHOU HOME",
    title: "伴手礼",
    description: "茉莉花茶、寿山石印章与肉燕，轻巧又有心意。",
  },
  {
    value: "STUDYTOUR" as const,
    index: "05",
    kicker: "LEARN ON THE ROAD",
    title: "研学体验",
    description: "跟着讲解与传承人，把坊巷读成一堂课。",
  },
];

const FEATURED_SLUGS = [
  "product-homestay",
  "product-fotiaoqiang",
  "product-shoushan",
  "product-jasmine-tea",
];

function matchesKeyword(product: ProductDto, keyword: string) {
  const text = keyword.trim().toLowerCase();
  if (!text) return true;
  return [
    product.title,
    product.summary,
    product.location,
    productCategoryLabel(product.category),
  ]
    .join(" ")
    .toLowerCase()
    .includes(text);
}

function ProductCard({ product }: { product: ProductDto }) {
  return (
    <Link className={`${styles.card} ${styles.foodCard}`} href={`/shop/${product.id}`}>
      <div
        className={styles.foodImage}
        style={{
          backgroundImage: `url('${product.image || "/images/resources/sanfangqixiang.jpg"}')`,
        }}
      >
        <span className={styles.badge}>{productCategoryLabel(product.category)}</span>
        <span className={styles.district}>{product.location || "福州"}</span>
      </div>
      <div className={styles.foodBody}>
        <h4>{product.title}</h4>
        <p>{product.summary}</p>
        <div className={styles.tags}>
          <span>{product.stock > 0 ? `余 ${product.stock} ${product.unit}` : "暂时售罄"}</span>
          <span>福州本地</span>
        </div>
        <div className={styles.priceRow}>
          <span className={styles.price}>
            {formatPrice(product.price)}
            <small>/{product.unit || "份"}</small>
          </span>
          <span className={styles.cardLink}>
            查看详情 <ArrowRight size={12} />
          </span>
        </div>
      </div>
    </Link>
  );
}

/**
 * 渲染游客端商城页。
 * 接口协作：/api/shop/products。
 */
export default function ShopPage() {
  const [category, setCategory] = useState<Filter>("ALL");
  const [keyword, setKeyword] = useState("");
  const [sort, setSort] = useState<Sort>("featured");
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/shop/products?pageSize=100")
      .then((response) => response.json())
      .then((payload: { data?: ProductDto[] }) => setProducts(payload.data ?? []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const sorted = useMemo(() => {
    const list = [...products];
    if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
    if (sort === "stock") list.sort((a, b) => b.stock - a.stock);
    return list;
  }, [products, sort]);

  const filtered = useMemo(
    () =>
      sorted.filter(
        (product) =>
          (category === "ALL" || product.category === category) &&
          matchesKeyword(product, keyword),
      ),
    [sorted, category, keyword],
  );

  const grouped = !keyword && category === "ALL";
  const featured = FEATURED_SLUGS.map((slug) =>
    products.find((product) => product.id === slug),
  ).filter((product): product is ProductDto => Boolean(product));
  const lowestPrice = products.length
    ? Math.min(...products.map((product) => product.price))
    : 0;
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const product of products) {
      map.set(product.category, (map.get(product.category) ?? 0) + 1);
    }
    return map;
  }, [products]);

  function chooseCategory(next: Filter) {
    setCategory(next);
    document.getElementById("all-goods")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <main className={`resource-page ${styles.page}`}>
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

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className="section-kicker" style={{ color: "#b4553e" }}>
            LOCAL GOODS &amp; EXPERIENCE
          </p>
          <h1>
            把福州
            <span>带回家</span>
          </h1>
          <p className={styles.lead}>
            民宿、餐饮、非遗手作、伴手礼与研学体验。逛完坊巷，把闽都的
            味道、手艺与慢生活一起带走。
          </p>
          <div className={styles.stats}>
            <div><strong>{products.length || "16"}</strong><span>件在售</span></div>
            <div><strong>5</strong><span>类好物</span></div>
            <div>
              <strong>{lowestPrice ? formatPrice(lowestPrice) : "¥28"}</strong>
              <span>起</span>
            </div>
          </div>
          <div className={styles.heroActions}>
            <a className={styles.primaryAction} href="#all-goods">
              逛在售商品 <ArrowRight size={14} />
            </a>
            <button className={styles.ghostAction} onClick={() => chooseCategory("HANDICRAFT")}>
              看非遗手作
            </button>
          </div>
          <p className={styles.heroNote}>
            线上下单 · 到店核销 / 顺丰发货 · 部分体验需提前预约
          </p>
        </div>

        <div className={styles.mosaic}>
          {featured.map((product, index) => (
            <Link
              className={`${styles.tile} ${index === 0 ? styles.tileMain : ""}`}
              href={`/shop/${product.id}`}
              key={product.id}
              style={{
                backgroundImage: `linear-gradient(180deg, rgba(25,30,26,0.02), rgba(25,30,26,0.62)), url('${product.image}')`,
              }}
            >
              <span className={styles.tileTag}>{productCategoryLabel(product.category)}</span>
              <strong>{product.title}</strong>
              <small>{formatPrice(product.price)} / {product.unit || "份"}</small>
            </Link>
          ))}
          {!featured.length && <div className={styles.tileSkeleton} />}
        </div>
      </section>

      <section className={styles.rail}>
        {PRODUCT_CATEGORIES.map((item) => (
          <button
            className={styles.railCard}
            key={item.value}
            onClick={() => chooseCategory(item.value)}
          >
            <span className={styles.railIcon}><Store size={18} /></span>
            <span className={styles.railText}>
              <b>{item.label}</b>
              <small>{counts.get(item.value) ?? 0} 件好物</small>
            </span>
            <em><ArrowRight size={14} /></em>
          </button>
        ))}
      </section>

      <section className={styles.toolbar} id="all-goods">
        <div className={styles.searchBox}>
          <Search size={18} />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索商品、地点，例如「鱼丸」「寿山石」"
            aria-label="搜索商品"
          />
          {keyword && (
            <button onClick={() => setKeyword("")} aria-label="清除搜索">
              <X size={14} />
            </button>
          )}
        </div>
        <div className={styles.filterRow}>
          <div className={styles.tabs}>
            <button
              className={category === "ALL" ? styles.tabActive : ""}
              onClick={() => setCategory("ALL")}
            >
              全部 <span>{products.length}</span>
            </button>
            {PRODUCT_CATEGORIES.map((item) => (
              <button
                key={item.value}
                className={category === item.value ? styles.tabActive : ""}
                onClick={() => setCategory(item.value)}
              >
                {item.label} <span>{counts.get(item.value) ?? 0}</span>
              </button>
            ))}
          </div>
          <div className={styles.filterTools}>
            <label className={styles.select}>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as Sort)}
                aria-label="排序方式"
              >
                <option value="featured">推荐排序</option>
                <option value="price-asc">价格从低到高</option>
                <option value="price-desc">价格从高到低</option>
                <option value="stock">库存优先</option>
              </select>
            </label>
          </div>
        </div>
      </section>

      <section className={styles.content}>
        {loading ? (
          <div className={styles.skeletonGrid}>
            {Array.from({ length: 6 }).map((_, index) => (
              <div className={styles.skeletonCard} key={index}>
                <span /><b /><i />
              </div>
            ))}
          </div>
        ) : !products.length ? (
          <div className={styles.empty}>
            <Store size={28} />
            <strong>还没有商品</strong>
            <p>等商户上架后，再来把福州带回家。</p>
          </div>
        ) : grouped ? (
          <>
            <div className={styles.resultHead}>
              <h2>在售商品</h2>
              <span className={styles.resultMeta}>
                共 {products.length} 件 · 按 5 类好物分区
              </span>
            </div>
            {SECTIONS.map((section) => {
              const items = sorted.filter((product) => product.category === section.value);
              if (!items.length) return null;
              return (
                <section className={styles.section} key={section.value}>
                  <div className={styles.sectionHead}>
                    <div className={styles.sectionTitle}>
                      <span>{section.index}</span>
                      <div>
                        <p className="section-kicker" style={{ color: "#b4553e" }}>
                          {section.kicker}
                        </p>
                        <h3>
                          {section.title}
                          <em>{items.length}</em>
                        </h3>
                        <p>{section.description}</p>
                      </div>
                    </div>
                    <button onClick={() => chooseCategory(section.value)}>
                      查看全部 <ArrowRight size={13} />
                    </button>
                  </div>
                  <div className={styles.foodGrid}>
                    {items.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </section>
              );
            })}
          </>
        ) : (
          <>
            <div className={styles.resultHead}>
              <h2>{keyword ? `「${keyword}」的结果` : "筛选结果"}</h2>
              <span className={styles.resultMeta}>共 {filtered.length} 件</span>
            </div>
            {filtered.length ? (
              <div className={styles.foodGrid}>
                {filtered.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className={styles.empty}>
                <Store size={28} />
                <strong>没有找到相关商品</strong>
                <p>换个关键词，或看看其他分类。</p>
                <button
                  onClick={() => {
                    setKeyword("");
                    setCategory("ALL");
                  }}
                >
                  查看全部商品
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
