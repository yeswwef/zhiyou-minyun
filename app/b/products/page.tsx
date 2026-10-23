/**
 * @module-note app/b/products/page.tsx
 * 商户端／商品页面。客户端组件负责状态与交互，数据经接口获取；不要在此放服务端密钥。
 */
"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  PRODUCT_CATEGORIES,
  formatPrice,
  productCategoryLabel,
  type ProductDto,
} from "@/features/merchant/types";

type FormState = {
  id: string | null;
  category: string;
  title: string;
  summary: string;
  description: string;
  price: string;
  stock: string;
  unit: string;
  image: string;
  location: string;
  status: "DRAFT" | "PUBLISHED";
};

const EMPTY_FORM: FormState = {
  id: null,
  category: "SOUVENIR",
  title: "",
  summary: "",
  description: "",
  price: "",
  stock: "100",
  unit: "份",
  image: "",
  location: "",
  status: "PUBLISHED",
};

/**
 * 渲染商户端／商品界面及其子组件。
 * 接口协作：/api/merchant/products、/api/merchant/products/${form.id}、/api/merchant/products/${product.id}。
 */
export default function MerchantProductsPage() {
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    fetch("/api/merchant/products")
      .then((response) => response.json())
      .then((payload: { data?: ProductDto[]; error?: string }) => {
        if (payload.error) throw new Error(payload.error);
        setProducts(payload.data ?? []);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(load, [load]);

  /**
   * 清空编辑数据并打开新建商品表单。
   */
  function startCreate() {
    setForm(EMPTY_FORM);
    setShowForm(true);
    setError("");
    setMessage("");
  }

  /**
   * 将选中商品填入编辑表单。
   * 输入：product；类型与可选项见函数签名。
   */
  function startEdit(product: ProductDto) {
    setForm({
      id: product.id,
      category: product.category,
      title: product.title,
      summary: product.summary,
      description: product.description,
      price: (product.price / 100).toString(),
      stock: String(product.stock),
      unit: product.unit ?? "",
      image: product.image ?? "",
      location: product.location ?? "",
      status: product.status,
    });
    setShowForm(true);
    setError("");
    setMessage("");
  }

  /**
   * 提交本页表单数据，处理服务端成功或失败结果。
   * 接口协作：/api/merchant/products/${form.id}、/api/merchant/products。
   * 输入：event；类型与可选项见函数签名。
   */
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    const body = {
      category: form.category,
      title: form.title,
      summary: form.summary,
      description: form.description,
      price: Number(form.price || 0),
      stock: Number(form.stock || 0),
      unit: form.unit,
      image: form.image,
      location: form.location,
      status: form.status,
    };

    const response = await fetch(
      form.id ? `/api/merchant/products/${form.id}` : "/api/merchant/products",
      {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const payload = (await response.json()) as { error?: string };
    setBusy(false);

    if (response.ok) {
      setMessage(form.id ? "商品已更新" : "商品已上架");
      setShowForm(false);
      setForm(EMPTY_FORM);
      load();
    } else {
      setError(payload.error ?? "保存失败");
    }
  }

  /**
   * 切换商品上架或下架状态。
   * 接口协作：/api/merchant/products/${product.id}。
   * 输入：product；类型与可选项见函数签名。
   */
  async function toggleStatus(product: ProductDto) {
    await fetch(`/api/merchant/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: product.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED" }),
    });
    load();
  }

  /**
   * 删除当前选中记录并更新界面。
   * 接口协作：/api/merchant/products/${product.id}。
   * 输入：product；类型与可选项见函数签名。
   */
  async function remove(product: ProductDto) {
    await fetch(`/api/merchant/products/${product.id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">商品管理</h1>
          <p className="mt-1 text-xs text-stone-500">
            支持民宿、餐饮、非遗手作、伴手礼、研学体验等上架；上架后 C 端商城即可见
          </p>
        </div>
        <button
          className="btn inline-flex items-center gap-2"
          onClick={startCreate}
        >
          <Plus size={16} /> 新增商品
        </button>
      </div>

      {message && <p className="text-xs text-tea">{message}</p>}
      {error && <p className="text-xs text-brand">{error}</p>}

      {showForm && (
        <form
          onSubmit={submit}
          className="grid gap-4 rounded-xl border border-stone-200 bg-white p-5 md:grid-cols-2"
        >
          <h2 className="md:col-span-2 text-sm font-semibold">
            {form.id ? "编辑商品" : "新增商品"}
          </h2>

          <label>
            <span className="mb-1 block text-xs text-stone-500">商品类别</span>
            <select
              className="input"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {PRODUCT_CATEGORIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-1 block text-xs text-stone-500">商品名称</span>
            <input
              className="input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="如：三坊七巷手作茉莉花茶礼盒"
            />
          </label>

          <label className="md:col-span-2">
            <span className="mb-1 block text-xs text-stone-500">一句话简介</span>
            <input
              className="input"
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              placeholder="显示在商品卡片上的简介"
            />
          </label>

          <label className="md:col-span-2">
            <span className="mb-1 block text-xs text-stone-500">详细描述（可选）</span>
            <textarea
              className="input min-h-20"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>

          <label>
            <span className="mb-1 block text-xs text-stone-500">价格（元）</span>
            <input
              className="input"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              inputMode="decimal"
              placeholder="68"
            />
          </label>

          <label>
            <span className="mb-1 block text-xs text-stone-500">库存</span>
            <input
              className="input"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              inputMode="numeric"
            />
          </label>

          <label>
            <span className="mb-1 block text-xs text-stone-500">单位（可选）</span>
            <input
              className="input"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              placeholder="份 / 晚 / 人"
            />
          </label>

          <label>
            <span className="mb-1 block text-xs text-stone-500">地点（可选）</span>
            <input
              className="input"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="福州市鼓楼区"
            />
          </label>

          <label className="md:col-span-2">
            <span className="mb-1 block text-xs text-stone-500">封面图地址（可选）</span>
            <input
              className="input"
              value={form.image}
              onChange={(e) => setForm({ ...form, image: e.target.value })}
              placeholder="/images/molihua.jpg"
            />
          </label>

          <label>
            <span className="mb-1 block text-xs text-stone-500">上架状态</span>
            <select
              className="input"
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as "DRAFT" | "PUBLISHED" })
              }
            >
              <option value="PUBLISHED">上架（C 端可见）</option>
              <option value="DRAFT">草稿（不下发）</option>
            </select>
          </label>

          <div className="flex items-end gap-2 md:col-span-2">
            <button className="btn" type="submit" disabled={busy}>
              {busy ? "保存中……" : form.id ? "保存修改" : "确认上架"}
            </button>
            <button
              className="btn-ghost"
              type="button"
              onClick={() => {
                setShowForm(false);
                setForm(EMPTY_FORM);
              }}
            >
              取消
            </button>
          </div>
        </form>
      )}

      {products.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <article
              key={product.id}
              className="flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white"
            >
              <div
                className="h-36 bg-stone-100 bg-cover bg-center"
                style={{
                  backgroundImage: `url('${product.image || "/images/sanfangqixiang.jpg"}')`,
                }}
              />
              <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-brand">{productCategoryLabel(product.category)}</span>
                  <span
                    className={
                      product.status === "PUBLISHED" ? "text-tea" : "text-stone-400"
                    }
                  >
                    {product.status === "PUBLISHED" ? "已上架" : "草稿"}
                  </span>
                </div>
                <h3 className="font-serif text-base font-semibold">{product.title}</h3>
                <p className="line-clamp-2 text-xs text-stone-500">{product.summary}</p>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <span className="text-brand font-semibold">
                    {formatPrice(product.price)}
                  </span>
                  <span className="text-[11px] text-stone-400">
                    库存 {product.stock} · 订单 {product.orderCount}
                  </span>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    className="btn-ghost flex-1 py-1.5 text-xs"
                    onClick={() => toggleStatus(product)}
                  >
                    {product.status === "PUBLISHED" ? "下架" : "上架"}
                  </button>
                  <button
                    className="btn-ghost inline-flex items-center justify-center px-3 py-1.5"
                    onClick={() => startEdit(product)}
                    aria-label="编辑"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    className="btn-ghost inline-flex items-center justify-center px-3 py-1.5 text-brand"
                    onClick={() => remove(product)}
                    aria-label="删除"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center text-sm text-stone-400">
          还没有商品，点右上角「新增商品」上架第一件吧。
        </div>
      )}
    </div>
  );
}
