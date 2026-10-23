/**
 * @module-note features/itinerary/ItineraryPlanner.tsx
 * 智能行程规划展示层：套餐模板筛选、一键套用、行程详情、路线图、保存与分享。
 */
"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import {
  ArrowRight, Bookmark, Bus, CalendarDays, Check, Clock, Compass, Flag, Footprints,
  Info, Landmark, LoaderCircle, Map, MapPin, Mountain, Route, Share2, Ship, Sparkles, Sun,
  Trees, Users, Utensils, Waves, X,
} from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { ITINERARY_TEMPLATES, ITINERARY_THEMES, getItineraryTemplate, type ItineraryTemplate } from "./templates";
import s from "./itinerary.module.css";

const SAVED_KEY = "zhiyou:itinerary-templates";

/** 把模板强调色注入 CSS 变量，卡片与详情共用同一主题色。 */
const accentStyle = (accent: string) => ({ "--accent": accent } as CSSProperties);

const THEME_ICONS = {
  登山: Mountain,
  非遗: Sparkles,
  海丝: Ship,
  温泉: Waves,
  古厝: Landmark,
  寺庙: Trees,
  海岛: Sun,
  红色: Flag,
} as const;

/** 生成高德地图搜索链接，不依赖地图 API Key。 */
function amapUrl(name: string) {
  return `https://uri.amap.com/search?keyword=${encodeURIComponent(`${name} 福州`)}&city=${encodeURIComponent("福州")}`;
}

type SessionUser = { id: string; username: string; nickname: string | null; role: string } | null;

const AI_INTERESTS = ["历史文化", "非遗手作", "美食", "自然山水", "拍照", "温泉", "红色研学"];
const AUDIENCES = ["亲子", "研学", "自驾", "老年"];
const PACES = ["轻松", "适中", "紧凑"];

/**
 * 管理模板筛选、一键套用、详情展开、保存到我的行程和分享链接。
 */
export function ItineraryPlanner({ initialTemplateId }: { initialTemplateId?: string }) {
  const initialApplied = getItineraryTemplate(initialTemplateId);
  const [filter, setFilter] = useState("全部");
  const [appliedId, setAppliedId] = useState(initialApplied?.id ?? "");
  const [activeDay, setActiveDay] = useState(1);
  const [user, setUser] = useState<SessionUser>(null);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [savingId, setSavingId] = useState("");
  const [notice, setNotice] = useState("");
  const [customPlan, setCustomPlan] = useState<ItineraryTemplate | null>(null);
  const [aiDays, setAiDays] = useState(2);
  const [audience, setAudience] = useState("亲子");
  const [pace, setPace] = useState("适中");
  const [interests, setInterests] = useState<string[]>(["历史文化", "非遗手作"]);
  const [planning, setPlanning] = useState(false);
  const [planError, setPlanError] = useState("");
  const [planStatus, setPlanStatus] = useState("");
  const [personalized, setPersonalized] = useState(false);
  const detail = useRef<HTMLElement>(null);

  const applied = customPlan ?? getItineraryTemplate(appliedId) ?? null;
  const visible = filter === "全部" ? ITINERARY_TEMPLATES : ITINERARY_TEMPLATES.filter((item) => item.themeShort === filter);
  const days = applied ? [...new Set(applied.stops.map((stop) => stop.day))] : [];

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((payload: { user?: SessionUser }) => setUser(payload.user ?? null))
      .catch(() => setUser(null));
    // 延迟读取本地存储，避免在 effect 同步阶段触发额外渲染。
    const timer = window.setTimeout(() => {
      try {
        const ids = JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]");
        if (Array.isArray(ids)) {
          setSaved(Object.fromEntries(ids.filter((id): id is string => typeof id === "string").map((id) => [id, true])));
        }
      } catch { /* 本地存储不可用时仍可正常浏览模板。 */ }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!initialTemplateId) return;
    const timer = window.setTimeout(() => detail.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 180);
    return () => window.clearTimeout(timer);
  }, [initialTemplateId]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  /** 套用模板并滚动到详情区。 */
  function apply(template: ItineraryTemplate) {
    setCustomPlan(null);
    setAppliedId(template.id);
    setActiveDay(1);
    setNotice("");
    window.setTimeout(() => detail.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }

  /** 调用 AI 路线推荐接口，按条件与历史偏好生成行程。 */
  async function generatePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (planning) return;
    setPlanning(true);
    setPlanError("");
    setPersonalized(false);
    setPlanStatus("正在分析条件与历史偏好…");
    const timer = window.setInterval(() => {
      setPlanStatus((current) => current === "正在分析条件与历史偏好…" ? "正在组合每日路线…" : "正在整理交通与美食建议…");
    }, 5000);
    try {
      const response = await fetch("/api/itinerary/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: aiDays, audience, pace, interests }),
        signal: AbortSignal.timeout(150000),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "生成路线失败");
      setCustomPlan(payload.plan as ItineraryTemplate);
      setAppliedId("");
      setActiveDay(1);
      setPersonalized(Boolean(payload.personalized));
      setNotice(payload.personalized ? "已结合你最近的收藏与浏览记录生成路线。" : "已根据输入条件生成路线。");
      window.setTimeout(() => detail.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    } catch (error) {
      setPlanError(error instanceof Error ? error.message : "生成路线失败，请稍后重试");
    } finally {
      window.clearInterval(timer);
      setPlanning(false);
    }
  }

  /** 切换兴趣标签，最多选择 5 个。 */
  function toggleInterest(value: string) {
    setInterests((items) => items.includes(value)
      ? items.filter((item) => item !== value)
      : [...items, value].slice(0, 5));
  }

  /** 保存到本机并从服务端写入「我的行程」（登录游客账号时）。 */
  async function save(template: ItineraryTemplate) {
    if (savingId) return;
    try {
      const ids = new Set(Object.keys(saved).filter((id) => saved[id]));
      ids.add(template.id);
      localStorage.setItem(SAVED_KEY, JSON.stringify([...ids]));
    } catch { /* 本地存储失败不阻塞服务端保存。 */ }
    setSaved((values) => ({ ...values, [template.id]: true }));

    if (!user) {
      setNotice("已保存到本机。登录后可同步到「我的行程」。");
      return;
    }

    setSavingId(template.id);
    try {
      const response = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: template.title,
          durationDays: template.durationDays,
          items: template.stops.map((stop, index) => ({
            resourceId: `${template.id}-${index + 1}`,
            title: `第${stop.day}天 ${stop.name}`,
            day: stop.day,
          })),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "保存失败");
      setNotice("已保存到「我的行程」，可在用户中心查看。");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "保存失败，已保留本机记录。");
    } finally {
      setSavingId("");
    }
  }

  /** 复制带模板参数的可分享链接；AI 定制路线暂不生成链接。 */
  async function share(template: ItineraryTemplate) {
    if (template.id.startsWith("ai-")) {
      setNotice("AI 定制路线暂不支持分享链接，可先保存到「我的行程」。");
      return;
    }
    const url = `${window.location.origin}/plan?template=${encodeURIComponent(template.id)}`;
    try {
      await navigator.clipboard.writeText(url);
      setNotice("分享链接已复制，可直接发给同行人。");
    } catch {
      window.prompt("复制分享链接", url);
    }
  }

  return (
    <div className={s.shell}>
      <header className={s.header}>
        <Link href="/home" className={s.brand} aria-label="智游闽韵首页">
          <span className={s.brandIcon}><BrandMark size={27} /></span>
          <span><strong>智游闽韵</strong><small>FUZHOU TRAVEL</small></span>
        </Link>
        <nav aria-label="主导航">
          <Link href="/home">发现</Link>
          <Link href="/ask">AI文化问答</Link>
          <Link href="/resources">文旅资源</Link>
          <Link href="/community">社区</Link>
          <Link href="/shop">商城</Link>
        </nav>
        <Link href="/home" className={s.back}>返回首页</Link>
      </header>

      <main className={s.main}>
        <section className={s.hero}>
          <p className={s.kicker}>SMART ITINERARY · 智能行程规划</p>
          <h1>选一份福州行程，<em>一键出发</em></h1>
          <p className={s.lead}>8 条主题套餐，覆盖登山、非遗、海丝、温泉、古厝、寺庙、海岛与红色研学；也可以按天数、人群和兴趣生成专属路线。</p>
          <div className={s.heroMeta}>
            <span><Route size={15} />8 条套餐</span>
            <span><Sparkles size={15} />AI 定制</span>
            <span><Map size={15} />路线图</span>
            <span><Bookmark size={15} />保存与分享</span>
          </div>
          <p className={s.sourceNote}><Info size={14} />模板整理自《资料11.xlsx》；时间为建议安排，开放时间、票价与交通以出行当天为准。</p>
        </section>

        <section className={s.aiPanel} aria-label="AI 路线智能推荐">
          <div className={s.aiPanelHead}>
            <span className={s.aiIcon}><Sparkles size={22} /></span>
            <div>
              <p className={s.kicker}>AI ROUTE RECOMMENDATION</p>
              <h2>按条件生成一条专属路线</h2>
              <p>选择天数、人群、节奏和兴趣；登录后还会结合你最近的收藏与浏览记录。</p>
            </div>
          </div>
          <form className={s.aiForm} onSubmit={generatePlan}>
            <div className={s.formRow}>
              <label>天数</label>
              <div className={s.segments}>
                {[1, 2, 3, 4, 5].map((day) => (
                  <button type="button" key={day} aria-pressed={aiDays === day} onClick={() => setAiDays(day)}>{day} 天</button>
                ))}
              </div>
            </div>
            <div className={s.formRow}>
              <label>人群</label>
              <div className={s.segments}>
                {AUDIENCES.map((value) => (
                  <button type="button" key={value} aria-pressed={audience === value} onClick={() => setAudience(value)}>{value}</button>
                ))}
              </div>
            </div>
            <div className={s.formRow}>
              <label>节奏</label>
              <div className={s.segments}>
                {PACES.map((value) => (
                  <button type="button" key={value} aria-pressed={pace === value} onClick={() => setPace(value)}>{value}</button>
                ))}
              </div>
            </div>
            <div className={s.formRow}>
              <label>兴趣</label>
              <div className={s.segments}>
                {AI_INTERESTS.map((value) => (
                  <button type="button" key={value} aria-pressed={interests.includes(value)} onClick={() => toggleInterest(value)}>
                    {interests.includes(value) && <Check size={12} />}{value}
                  </button>
                ))}
              </div>
            </div>
            <div className={s.aiFormFoot}>
              <p><Users size={14} />未登录时只按上方条件生成；登录后会读取最近收藏与浏览记录作为偏好。</p>
              <button type="submit" disabled={planning}>
                {planning ? <><LoaderCircle className={s.spinner} size={16} />{planStatus}</> : <><Sparkles size={16} />生成我的路线</>}
              </button>
            </div>
            {planError && <p className={s.planError} role="alert"><Info size={14} />{planError}</p>}
          </form>
        </section>

        <section className={s.filterRow} aria-label="按主题筛选">
          <div className={s.filters}>
            {ITINERARY_THEMES.map((theme) => (
              <button key={theme} aria-pressed={filter === theme} onClick={() => setFilter(theme)}>{theme}</button>
            ))}
          </div>
          <span className={s.count}>{visible.length} 条可套用</span>
        </section>

        <section className={s.grid} aria-label="套餐行程模板">
          {visible.map((template) => {
            const Icon = THEME_ICONS[template.themeShort as keyof typeof THEME_ICONS] ?? Route;
            const isApplied = appliedId === template.id;
            return (
              <article key={template.id} className={`${s.card} ${isApplied ? s.cardApplied : ""}`} style={accentStyle(template.accent)}>
                <div className={s.cardTop}>
                  <span className={s.themeIcon}><Icon size={21} /></span>
                  <span className={s.themeName}>{template.theme}</span>
                  <span className={s.duration}><CalendarDays size={12} />{template.durationLabel}</span>
                </div>
                <h3>{template.title}</h3>
                <p className={s.subtitle}>{template.subtitle}</p>
                <p className={s.attractions}><MapPin size={14} />{template.attractions.slice(0, 3).join(" · ")}{template.attractions.length > 3 ? ` 等 ${template.attractions.length} 处` : ""}</p>
                <div className={s.foodTags}>{template.food.slice(0, 4).map((food) => <span key={food}>{food}</span>)}</div>
                <div className={s.cardFoot}>
                  <span className={s.suitable}><Users size={13} />{template.suitable}</span>
                  <button onClick={() => apply(template)} aria-pressed={isApplied}>
                    {isApplied ? <><Check size={15} />已套用</> : <>一键套用<ArrowRight size={15} /></>}
                  </button>
                </div>
              </article>
            );
          })}
        </section>

        {applied && (
          <section ref={detail} className={s.detail} style={accentStyle(applied.accent)} aria-label="已套用的行程">
            <header className={s.detailHead}>
              <div>
                <p className={s.kicker}>{applied.id.startsWith("ai-") ? "AI 定制路线" : `已套用套餐 · ${applied.theme}`}</p>
                <h2>{applied.title}</h2>
                <p className={s.detailSub}>{applied.subtitle}</p>
                <div className={s.detailTags}>
                  <span><CalendarDays size={13} />{applied.durationLabel}</span>
                  <span><Users size={13} />{applied.suitable}</span>
                  <span><Footprints size={13} />{applied.highlight}</span>
                  {personalized && applied.id.startsWith("ai-") && <span className={s.personalTag}><Sparkles size={12} />已结合历史偏好</span>}
                </div>
              </div>
              <div className={s.detailActions}>
                <button className={s.saveButton} onClick={() => save(applied)}
                  disabled={savingId === applied.id || (Boolean(saved[applied.id]) && Boolean(user))}>
                  <Bookmark size={15} />{savingId === applied.id ? "保存中…" : saved[applied.id] ? "已保存" : "保存到我的行程"}
                </button>
                <button className={s.shareButton} onClick={() => share(applied)}><Share2 size={15} />复制分享链接</button>
                <button className={s.closeButton} onClick={() => { setCustomPlan(null); setAppliedId(""); }} aria-label="关闭行程详情"><X size={17} /></button>
              </div>
            </header>

            {notice && <p className={s.notice} role="status">{notice}</p>}
            {applied.note && <p className={s.dataNote}><Info size={15} />{applied.note}</p>}

            <div className={s.detailGrid}>
              <div className={s.timeline}>
                <div className={s.timelineHead}>
                  <h3><Clock size={17} />建议行程</h3>
                  <div className={s.dayTabs}>
                    {days.map((day) => (
                      <button key={day} aria-pressed={activeDay === day} onClick={() => setActiveDay(day)}>第{day}天</button>
                    ))}
                  </div>
                </div>
                <div className={s.timelineList}>
                  {applied.stops.filter((stop) => stop.day === activeDay).map((stop, index) => (
                    <article key={`${stop.day}-${stop.time}-${stop.name}`} className={s.stop}>
                      <div className={s.stopTime}>{stop.time}</div>
                      <div className={s.stopDot}><span>{index + 1}</span></div>
                      <div className={s.stopBody}>
                        <h4>{stop.name}</h4>
                        <p>{stop.activity}</p>
                        {stop.note && <small>{stop.note}</small>}
                        <a href={amapUrl(stop.name)} target="_blank" rel="noopener noreferrer"><MapPin size={13} />在地图中查看</a>
                      </div>
                    </article>
                  ))}
                </div>
                <p className={s.timelineNote}><Info size={14} />时间与顺序为模板建议，请按当天开放、交通和体力情况调整。</p>
              </div>

              <aside className={s.side}>
                <div className={s.mapCard}>
                  <div className={s.mapHead}><Compass size={16} />行程路线图<span>示意图</span></div>
                  <div className={s.mapCanvas}>
                    <span className={s.mapWatermark}>福州</span>
                    <svg className={s.mapPath} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                      <polyline points={applied.map.map((stop) => `${stop.x},${stop.y}`).join(" ")}
                        fill="none" stroke="var(--accent)" strokeWidth="0.7" strokeDasharray="2 1.6" strokeLinecap="round" />
                    </svg>
                    {applied.map.map((stop, index) => (
                      <a key={`${stop.name}-${index}`} className={s.mapStop} href={amapUrl(stop.name)}
                        target="_blank" rel="noopener noreferrer" style={{ left: `${stop.x}%`, top: `${stop.y}%` }}
                        title={`在高德地图中查看 ${stop.name}`}>
                        <span>{index + 1}</span><b>{stop.name}</b>
                      </a>
                    ))}
                  </div>
                  <p>点击站点可在高德地图中查看位置；示意图不代表实际地理比例。{applied.stops.length > applied.map.length ? "路线图仅展示前 8 个主要站点。" : ""}</p>
                </div>

                <div className={s.infoCard}>
                  <h3><Utensils size={16} />特色美食</h3>
                  <div className={s.chips}>{applied.food.map((food) => <span key={food}>{food}</span>)}</div>
                </div>
                <div className={s.infoCard}>
                  <h3><Bus size={16} />交通建议</h3>
                  <p>{applied.transport}</p>
                </div>
                <div className={s.infoCard}>
                  <h3><MapPin size={16} />代表景区</h3>
                  <p>{applied.attractions.join("、")}</p>
                </div>
                <div className={s.infoCard}>
                  <h3><Route size={16} />路线摘要</h3>
                  <p>{applied.routeSummary}</p>
                </div>
              </aside>
            </div>
          </section>
        )}

        <section className={s.aiCta}>
          <div>
            <p className={s.kicker}>NEED A CUSTOM PLAN</p>
            <h2>想按人数、天数和节奏再调整？</h2>
            <p>带着喜欢的模板去 AI 文化问答，继续问路线、交通和适老化安排。</p>
          </div>
          <Link href="/ask">去 AI 文化问答<ArrowRight size={16} /></Link>
        </section>
      </main>
    </div>
  );
}
