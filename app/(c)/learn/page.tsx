/**
 * @module-note app/(c)/learn/page.tsx
 * 游客端／非遗学习页面。客户端组件负责状态与交互，数据经接口获取；不要在此放服务端密钥。
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, GraduationCap, MapPin, Users } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { formatPrice } from "@/features/merchant/types";

type Work = {
  id: string;
  title: string;
  description: string;
  image: string | null;
  merchant: { id: string; nickname: string | null; username: string; merchantName: string | null };
};

type ClassItem = {
  id: string;
  title: string;
  summary: string;
  price: number;
  capacity: number;
  schedule: string;
  location: string | null;
  image: string | null;
  enrollmentCount: number;
  enrolled: boolean;
  merchant: { id: string; nickname: string | null; username: string; merchantName: string | null };
};

/**
 * 渲染游客端／非遗学习界面及其子组件。
 * 接口协作：/api/classes、/api/works、/api/classes/${item.id}/enroll。
 */
export default function LearnPage() {
  const router = useRouter();
  const [works, setWorks] = useState<Work[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /**
   * 加载体验课程并更新页面列表。
   * 接口协作：/api/classes。
   */
  function loadClasses() {
    fetch("/api/classes")
      .then((r) => r.json())
      .then((p: { data?: ClassItem[] }) => setClasses(p.data ?? []))
      .catch(() => setClasses([]));
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/works")
        .then((r) => r.json())
        .then((p: { data?: Work[] }) => p.data ?? [])
        .catch(() => []),
      fetch("/api/classes")
        .then((r) => r.json())
        .then((p: { data?: ClassItem[] }) => p.data ?? [])
        .catch(() => []),
    ])
      .then(([workList, classList]) => {
        setWorks(workList);
        setClasses(classList);
      })
      .finally(() => setLoading(false));
  }, []);

  /**
   * 为当前用户提交课程报名并更新显示状态。
   * 接口协作：/api/classes/${item.id}/enroll。
   * 输入：item；类型与可选项见函数签名。
   */
  async function enroll(item: ClassItem) {
    setError("");
    const response = await fetch(`/api/classes/${item.id}/enroll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (response.status === 401) {
      router.push("/login");
      return;
    }
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "报名失败");
      return;
    }
    loadClasses();
  }

  /**
   * 提交取消操作并更新当前页面状态。
   * 接口协作：/api/classes/${item.id}/enroll。
   * 输入：item；类型与可选项见函数签名。
   */
  async function cancel(item: ClassItem) {
    setError("");
    const response = await fetch(`/api/classes/${item.id}/enroll`, { method: "DELETE" });
    if (response.ok) loadClasses();
  }

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
          <Link href="/shop">商城</Link>
          <Link className="active" href="/learn">非遗学习</Link>
        </nav>
        <Link href="/home" className="resource-user">返回首页</Link>
      </header>

      <header className="resource-header">
        <div>
          <p className="section-kicker">INTANGIBLE HERITAGE</p>
          <h1>非遗学习</h1>
          <p>逛非遗传承人的线上作品展厅，报名一门线下体验课。</p>
        </div>
        <Link href="/shop" className="resource-back">
          去商城逛逛
        </Link>
      </header>

      {error && (
        <div className="mx-auto mb-3 w-[min(1200px,calc(100%-48px))]">
          <p className="text-sm text-brand">{error}</p>
        </div>
      )}

      <section className="resource-results">
        <div className="resource-result-heading">
          <h2>作品线上展厅</h2>
          <span>共 {works.length} 件</span>
        </div>

        {loading ? (
          <div className="resource-empty">正在加载……</div>
        ) : works.length ? (
          <div className="resource-grid">
            {works.map((work) => (
              <article className="resource-card" key={work.id}>
                <div
                  className="resource-card-image"
                  style={{
                    backgroundImage: `url('${work.image || "/images/zhenhailou.jpg"}')`,
                  }}
                />
                <div className="resource-card-body">
                  <div className="resource-card-top">
                    <span className="resource-category">非遗作品</span>
                    <span className="resource-district">
                      {work.merchant.merchantName || work.merchant.nickname || work.merchant.username}
                    </span>
                  </div>
                  <h3>{work.title}</h3>
                  <p>{work.description}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="resource-empty">还没有作品，等传承人上传后再来看看。</div>
        )}
      </section>

      <section className="resource-results">
        <div className="resource-result-heading">
          <h2>线上预约体验课</h2>
          <span>共 {classes.length} 门</span>
        </div>

        {loading ? (
          <div className="resource-empty">正在加载……</div>
        ) : classes.length ? (
          <div className="resource-grid">
            {classes.map((item) => (
              <article className="resource-card" key={item.id}>
                <div
                  className="resource-card-image"
                  style={{
                    backgroundImage: `url('${item.image || "/images/molihua.jpg"}')`,
                  }}
                />
                <div className="resource-card-body">
                  <div className="resource-card-top">
                    <span className="resource-category">
                      <GraduationCap size={12} className="mr-1 inline" />
                      体验课
                    </span>
                    <span className="resource-district">
                      {item.enrollmentCount}/{item.capacity} 人
                    </span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.summary}</p>

                  <div className="mt-3 space-y-1 text-xs text-stone-500">
                    <p className="flex items-center gap-1">
                      <CalendarDays size={13} /> {item.schedule}
                    </p>
                    {item.location && (
                      <p className="flex items-center gap-1">
                        <MapPin size={13} /> {item.location}
                      </p>
                    )}
                    <p className="flex items-center gap-1">
                      <Users size={13} />
                      {item.merchant.merchantName || item.merchant.nickname || item.merchant.username}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-semibold text-brand">
                      {item.price > 0 ? formatPrice(item.price) : "免费"}
                    </span>
                    {item.enrolled ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-tea">已报名</span>
                        <button
                          className="btn-ghost py-1 text-xs"
                          onClick={() => cancel(item)}
                        >
                          取消报名
                        </button>
                      </div>
                    ) : (
                      <button
                        className="btn py-1.5 text-xs"
                        onClick={() => enroll(item)}
                        disabled={item.enrollmentCount >= item.capacity}
                      >
                        {item.enrollmentCount >= item.capacity ? "名额已满" : "立即报名"}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="resource-empty">还没有体验课，等传承人开课后就能报名啦。</div>
        )}
      </section>
    </main>
  );
}
