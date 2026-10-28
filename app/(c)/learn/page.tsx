/**
 * @module-note app/(c)/learn/page.tsx
 * 游客端／非遗学习页面：作品线上展厅 + 线下体验课报名，按「逛展 → 报名」组织内容。
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  Check,
  GraduationCap,
  MapPin,
  Palette,
  Search,
  Users,
  X,
} from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { formatPrice } from "@/features/merchant/types";
import styles from "@/features/commerce/commerce.module.css";

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

type Tab = "ALL" | "WORKS" | "CLASSES";

function merchantName(merchant: Work["merchant"]) {
  return merchant.merchantName || merchant.nickname || merchant.username;
}

function matchesWork(work: Work, keyword: string) {
  const text = keyword.trim().toLowerCase();
  if (!text) return true;
  return `${work.title} ${work.description} ${merchantName(work.merchant)}`
    .toLowerCase()
    .includes(text);
}

function matchesClass(item: ClassItem, keyword: string) {
  const text = keyword.trim().toLowerCase();
  if (!text) return true;
  return `${item.title} ${item.summary} ${item.location ?? ""} ${item.schedule}`
    .toLowerCase()
    .includes(text);
}

function WorkCard({ work, onOpen }: { work: Work; onOpen: (work: Work) => void }) {
  return (
    <button
      className={`${styles.card} ${styles.ichCard} ${styles.workButton}`}
      onClick={() => onOpen(work)}
    >
      <div
        className={styles.ichImage}
        style={{
          backgroundImage: `url('${work.image || "/images/resources/shangxiahang.jpg"}')`,
        }}
      />
      <div className={styles.ichBody}>
        <span className={styles.eyebrow}>非遗作品 · {merchantName(work.merchant)}</span>
        <h4>{work.title}</h4>
        <p>{work.description}</p>
        <span className={styles.cardLink}>
          查看作品 <ArrowRight size={13} />
        </span>
      </div>
    </button>
  );
}

/**
 * 渲染游客端非遗学习页。
 * 接口协作：/api/works、/api/classes、/api/classes/{id}/enroll。
 */
export default function LearnPage() {
  const router = useRouter();
  const [works, setWorks] = useState<Work[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [keyword, setKeyword] = useState("");
  const [tab, setTab] = useState<Tab>("ALL");
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);

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

  useEffect(() => {
    if (!selectedWork) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedWork(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedWork]);

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

  async function cancel(item: ClassItem) {
    setError("");
    const response = await fetch(`/api/classes/${item.id}/enroll`, { method: "DELETE" });
    if (response.ok) loadClasses();
  }

  const filteredWorks = useMemo(
    () => works.filter((work) => matchesWork(work, keyword)),
    [works, keyword],
  );
  const filteredClasses = useMemo(
    () => classes.filter((item) => matchesClass(item, keyword)),
    [classes, keyword],
  );
  const showWorks = tab !== "CLASSES";
  const showClasses = tab !== "WORKS";
  const totalSeats = classes.reduce((sum, item) => sum + item.capacity, 0);
  const lowestPrice = classes.length
    ? Math.min(...classes.map((item) => item.price))
    : 0;

  function openTab(next: Tab, anchor: string) {
    setTab(next);
    window.setTimeout(() => {
      document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
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
          <Link href="/shop">商城</Link>
          <Link className="active" href="/learn">非遗学习</Link>
        </nav>
        <Link href="/home" className="resource-user">返回首页</Link>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className="section-kicker" style={{ color: "#b4553e" }}>
            INTANGIBLE HERITAGE · FUZHOU
          </p>
          <h1>
            手艺，还在
            <span>坊巷里</span>
          </h1>
          <p className={styles.lead}>
            逛传承人的线上展厅，再报一门线下体验课。寿山石、脱胎漆器、软木画、
            茉莉花茶、闽剧与鱼丸，都能亲手做一次。
          </p>
          <div className={styles.stats}>
            <div><strong>{works.length || "6"}</strong><span>件作品</span></div>
            <div><strong>{classes.length || "6"}</strong><span>门体验课</span></div>
            <div><strong>{totalSeats || "89"}</strong><span>个名额</span></div>
          </div>
          <div className={styles.heroActions}>
            <button className={styles.primaryAction} onClick={() => openTab("WORKS", "works")}>
              逛作品展厅 <ArrowRight size={14} />
            </button>
            <button className={styles.ghostAction} onClick={() => openTab("CLASSES", "classes")}>
              看体验课
            </button>
          </div>
          <p className={styles.heroNote}>
            点击作品看细节 · 体验课由传承人/工作室开课 · 报名后到店参加
          </p>
        </div>

        <div className={styles.mosaic}>
          {works.slice(0, 4).map((work, index) => (
            <button
              className={`${styles.tile} ${styles.tileButton} ${index === 0 ? styles.tileMain : ""}`}
              key={work.id}
              onClick={() => setSelectedWork(work)}
              style={{
                backgroundImage: `linear-gradient(180deg, rgba(25,30,26,0.02), rgba(25,30,26,0.66)), url('${work.image || "/images/resources/shangxiahang.jpg"}')`,
              }}
            >
              <span className={styles.tileTag}>非遗作品</span>
              <strong>{work.title}</strong>
              <small>{merchantName(work.merchant)}</small>
            </button>
          ))}
          {!works.length && <div className={styles.tileSkeleton} />}
        </div>
      </section>

      <section className={styles.rail}>
        <button className={styles.railCard} onClick={() => openTab("WORKS", "works")}>
          <span className={styles.railIcon}><Palette size={18} /></span>
          <span className={styles.railText}>
            <b>作品线上展厅</b>
            <small>{works.length} 件作品 · 点击看细节</small>
          </span>
          <em><ArrowRight size={14} /></em>
        </button>
        <button className={styles.railCard} onClick={() => openTab("CLASSES", "classes")}>
          <span className={styles.railIcon}><GraduationCap size={18} /></span>
          <span className={styles.railText}>
            <b>线下体验课</b>
            <small>{classes.length} 门课 · 从 ¥{lowestPrice ? Math.round(lowestPrice / 100) : 88} 起</small>
          </span>
          <em><ArrowRight size={14} /></em>
        </button>
        <button className={styles.railCard} onClick={() => openTab("ALL", "learn-catalog")}>
          <span className={styles.railIcon}><Users size={18} /></span>
          <span className={styles.railText}>
            <b>传承人与工作室</b>
            <small>{new Set(works.map((work) => work.merchant.id)).size || 1} 间工作室 · 线下可约</small>
          </span>
          <em><ArrowRight size={14} /></em>
        </button>
      </section>

      <section className={styles.toolbar} id="learn-catalog">
        <div className={styles.searchBox}>
          <Search size={18} />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索作品、课程，例如「软木画」「鱼丸」"
            aria-label="搜索作品与课程"
          />
          {keyword && (
            <button onClick={() => setKeyword("")} aria-label="清除搜索">
              <X size={14} />
            </button>
          )}
        </div>
        <div className={styles.filterRow}>
          <div className={styles.tabs}>
            <button className={tab === "ALL" ? styles.tabActive : ""} onClick={() => setTab("ALL")}>
              全部 <span>{works.length + classes.length}</span>
            </button>
            <button
              className={tab === "WORKS" ? styles.tabActive : ""}
              onClick={() => setTab("WORKS")}
            >
              作品展厅 <span>{works.length}</span>
            </button>
            <button
              className={tab === "CLASSES" ? styles.tabActive : ""}
              onClick={() => setTab("CLASSES")}
            >
              体验课 <span>{classes.length}</span>
            </button>
          </div>
          <div className={styles.filterTools}>
            <span className={styles.resultMeta}>
              {keyword ? `搜索「${keyword}」` : "按内容浏览"}
            </span>
          </div>
        </div>
      </section>

      {error && <div className={styles.errorBar}>{error}</div>}

      <section className={styles.content}>
        {loading ? (
          <div className={styles.skeletonGrid}>
            {Array.from({ length: 4 }).map((_, index) => (
              <div className={styles.skeletonCard} key={index}>
                <span /><b /><i />
              </div>
            ))}
          </div>
        ) : (
          <>
            {showWorks && (
              <section className={styles.section} id="works">
                <div className={styles.sectionHead}>
                  <div className={styles.sectionTitle}>
                    <span>01</span>
                    <div>
                      <p className="section-kicker" style={{ color: "#b4553e" }}>
                        STUDIO SHOWCASE
                      </p>
                      <h3>
                        作品线上展厅
                        <em>{filteredWorks.length}</em>
                      </h3>
                      <p>寿山石、漆器、软木画、脸谱与茶席，点开看作品细节。</p>
                    </div>
                  </div>
                  <button onClick={() => setTab("WORKS")}>
                    只看作品 <ArrowRight size={13} />
                  </button>
                </div>
                {filteredWorks.length ? (
                  <div className={styles.scenicGrid}>
                    {filteredWorks.map((work) => (
                      <WorkCard key={work.id} work={work} onOpen={setSelectedWork} />
                    ))}
                  </div>
                ) : (
                  <div className={styles.empty}>
                    <Palette size={26} />
                    <strong>没有找到相关作品</strong>
                    <p>换个关键词，或看看体验课。</p>
                  </div>
                )}
              </section>
            )}

            {showClasses && (
              <section className={styles.section} id="classes">
                <div className={styles.sectionHead}>
                  <div className={styles.sectionTitle}>
                    <span>02</span>
                    <div>
                      <p className="section-kicker" style={{ color: "#b4553e" }}>
                        HANDS-ON CLASSES
                      </p>
                      <h3>
                        线上预约体验课
                        <em>{filteredClasses.length}</em>
                      </h3>
                      <p>从入门到完成一件小作品，名额有限，报满即止。</p>
                    </div>
                  </div>
                  <button onClick={() => setTab("CLASSES")}>
                    只看课程 <ArrowRight size={13} />
                  </button>
                </div>
                {filteredClasses.length ? (
                  <div className={styles.classGrid}>
                    {filteredClasses.map((item) => (
                      <article className={`${styles.card} ${styles.classCard}`} key={item.id}>
                        <div
                          className={styles.classImage}
                          style={{
                            backgroundImage: `url('${item.image || "/images/resources/molihua.jpg"}')`,
                          }}
                        >
                          <span className={styles.badge}>
                            <GraduationCap size={11} /> 体验课
                          </span>
                          <span className={styles.district}>
                            {item.enrollmentCount}/{item.capacity} 人
                          </span>
                        </div>
                        <div className={styles.classBody}>
                          <h4>{item.title}</h4>
                          <p>{item.summary}</p>
                          <ul className={styles.classMeta}>
                            <li><CalendarDays size={12} /> {item.schedule}</li>
                            {item.location && <li><MapPin size={12} /> {item.location}</li>}
                            <li><Users size={12} /> {merchantName(item.merchant)}</li>
                          </ul>
                          <div className={styles.enrollRow}>
                            <span className={styles.price}>
                              {item.price > 0 ? formatPrice(item.price) : "免费"}
                              <small>/人</small>
                            </span>
                            {item.enrolled ? (
                              <div className="flex items-center gap-2">
                                <span className="flex items-center gap-1 text-[11px] text-[#6d7f62]">
                                  <Check size={12} /> 已报名
                                </span>
                                <button className={styles.cancelBtn} onClick={() => cancel(item)}>
                                  取消
                                </button>
                              </div>
                            ) : (
                              <button
                                className={styles.enrollBtn}
                                onClick={() => enroll(item)}
                                disabled={item.enrollmentCount >= item.capacity}
                              >
                                {item.enrollmentCount >= item.capacity ? "名额已满" : "立即报名"}
                              </button>
                            )}
                          </div>
                          <span className={styles.seatText}>
                            剩余 {Math.max(0, item.capacity - item.enrollmentCount)} 个名额
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className={styles.empty}>
                    <GraduationCap size={26} />
                    <strong>没有找到相关课程</strong>
                    <p>换个关键词，或先看看作品展厅。</p>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </section>

      {selectedWork && (
        <div className={styles.modalBackdrop} onClick={() => setSelectedWork(null)}>
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-label={selectedWork.title}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className={styles.modalImage}
              style={{
                backgroundImage: `url('${selectedWork.image || "/images/resources/shangxiahang.jpg"}')`,
              }}
            />
            <div className={styles.modalBody}>
              <button
                className={styles.modalClose}
                onClick={() => setSelectedWork(null)}
                aria-label="关闭"
              >
                <X size={16} />
              </button>
              <p className={styles.modalKicker}>STUDIO WORK · 非遗作品</p>
              <h3>{selectedWork.title}</h3>
              <p>{selectedWork.description}</p>
              <div className={styles.tags}>
                <span>非遗作品</span>
                <span>福州</span>
                <span>可线下体验</span>
              </div>
              <div className={styles.modalMeta}>
                <span>传承人 / 工作室 <b>{merchantName(selectedWork.merchant)}</b></span>
                <span>想看实物？报名对应体验课，到工作室慢慢看。</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
