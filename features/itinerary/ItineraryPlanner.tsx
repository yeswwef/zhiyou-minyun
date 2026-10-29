/**
 * @module-note features/itinerary/ItineraryPlanner.tsx
 * 智能行程规划展示层：套餐模板筛选、一键套用、行程详情、路线图、保存与分享。
 */
"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import {
  ArrowLeft, ArrowRight, Bookmark, Bus, CalendarDays, Check, Clock, Compass, Flag, Footprints,
  Info, Landmark, LoaderCircle, Map as MapIcon, MapPin, Mountain, Route, Share2, Ship, Sparkles, Sun,
  Trees, Users, Utensils, Waves, X,
} from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { ITINERARY_TEMPLATES, ITINERARY_THEMES, getItineraryTemplate, type ItineraryTemplate } from "./templates";
import s from "./itinerary.module.css";

const SAVED_KEY = "zhiyou:itinerary-templates";
/** AI 定制与分享路线没有封面时统一用坊巷实拍兜底。 */
const FALLBACK_COVER = "/images/sanfangqixiang.jpg";

type SummaryLine = { day: number; text: string };

/** 把「Day1 …；Day2 …」拆成按天分段的摘要；没有日期标记但跨度多天时用站点名兜底。 */
function splitSummary(plan: ItineraryTemplate): SummaryLine[] {
  const segments = plan.routeSummary
    .split(/[；;]\s*(?=(?:Day\s*\d+|第\s*\d+\s*天))/i)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => {
      const matched = segment.match(/^(?:Day\s*(\d+)|第\s*(\d+)\s*天)\s*[:：]?\s*(.*)$/i);
      return matched
        ? { day: Number(matched[1] ?? matched[2]), text: matched[3] }
        : { day: 0, text: segment };
    });

  const days = [...new Set(plan.stops.map((stop) => stop.day))].sort((a, b) => a - b);
  if (segments.length === 1 && days.length > 1) {
    return days.map((day) => ({
      day,
      text: plan.stops.filter((stop) => stop.day === day).map((stop) => stop.name).join(" → "),
    }));
  }
  return segments;
}

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

/** 服务端解析出的真实坐标点；order 用于地图标注编号，x/y 为图片内百分比位置。 */
type MapPoint = {
  name: string; day: number; lat: number; lng: number; order: number;
  markerUrl: string; color: string; x: number; y: number;
};

type MapPayload = {
  available: boolean;
  points: MapPoint[];
  imageUrl?: string;
  navigationUrl?: string;
  distanceKm?: number;
  missing?: { name: string; day: number }[];
  note?: string;
};

const AI_INTERESTS = ["历史文化", "非遗手作", "美食", "自然山水", "拍照", "温泉", "红色研学"];
const AUDIENCES = ["亲子", "研学", "自驾", "老年"];
const PACES = ["轻松", "适中", "紧凑"];

/**
 * 管理模板筛选、一键套用、详情展开、保存到我的行程和分享链接。
 */
export function ItineraryPlanner({
  initialTemplateId,
  initialSharedPlan = null,
  shareError = "",
}: {
  initialTemplateId?: string;
  initialSharedPlan?: ItineraryTemplate | null;
  shareError?: string;
}) {
  const initialApplied = getItineraryTemplate(initialTemplateId);
  const [filter, setFilter] = useState("全部");
  const [appliedId, setAppliedId] = useState(initialApplied?.id ?? "");
  const [activeDay, setActiveDay] = useState(1);
  const [user, setUser] = useState<SessionUser>(null);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [savingId, setSavingId] = useState("");
  const [notice, setNotice] = useState("");
  const [customPlan, setCustomPlan] = useState<ItineraryTemplate | null>(initialSharedPlan);
  const [aiDays, setAiDays] = useState(2);
  const [audience, setAudience] = useState("亲子");
  const [pace, setPace] = useState("适中");
  const [interests, setInterests] = useState<string[]>(["历史文化", "非遗手作"]);
  const [planning, setPlanning] = useState(false);
  const [planError, setPlanError] = useState("");
  const [planStatus, setPlanStatus] = useState("");
  const [personalized, setPersonalized] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [mapData, setMapData] = useState<(MapPayload & { key: string }) | null>(null);
  const detail = useRef<HTMLElement>(null);
  const templates = useRef<HTMLElement>(null);

  const applied = customPlan ?? getItineraryTemplate(appliedId) ?? null;
  const visible = filter === "全部" ? ITINERARY_TEMPLATES : ITINERARY_TEMPLATES.filter((item) => item.themeShort === filter);
  const days = applied ? [...new Set(applied.stops.map((stop) => stop.day))] : [];
  const summaryLines = applied ? splitSummary(applied) : [];

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

  const mapKey = applied ? `${applied.id}:${applied.stops.length}` : "";
  const mapLoading = Boolean(applied) && mapData?.key !== mapKey;
  const mapPoints = mapData?.key === mapKey ? mapData.points : [];
  const pointByName = new Map(mapPoints.map((point) => [point.name, point]));
  // 地图展示整趟行程；时间轴仍按选中的第 N 天切换，图上的当天站点会高亮。
  const missingPoints = mapData?.missing ?? [];

  // 站名解析为真实坐标：服务端带 key 调高德，前端只拿坐标与本站图片地址。
  useEffect(() => {
    if (!applied) return;
    const key = `${applied.id}:${applied.stops.length}`;
    const controller = new AbortController();
    fetch("/api/itinerary/map", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stops: applied.stops.map((stop) => ({ name: stop.name, day: stop.day })) }),
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((payload: MapPayload) => setMapData({ ...payload, key }))
      .catch(() => {
        if (!controller.signal.aborted) {
          setMapData({ key, available: false, points: [], note: "地图解析失败，已回退示意图" });
        }
      });
    return () => controller.abort();
  }, [applied]);

  /** 套用模板并滚动到详情区。 */
  function apply(template: ItineraryTemplate) {
    setCustomPlan(null);
    setAppliedId(template.id);
    setActiveDay(1);
    setNotice("");
    window.setTimeout(() => detail.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }

  /** 从 AI／分享路线回到模板列表，清空定制结果并滚回筛选区。 */
  function backToTemplates() {
    setCustomPlan(null);
    setAppliedId("");
    setActiveDay(1);
    setNotice("");
    window.setTimeout(() => templates.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
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
            resourceId: `plan:${template.id}-${index + 1}`,
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

  /** 复制分享链接：AI 定制路线先存成快照，模板路线直接带 id。 */
  async function share(template: ItineraryTemplate) {
    if (sharing) return;
    let url = `${window.location.origin}/plan?template=${encodeURIComponent(template.id)}`;

    if (template.id.startsWith("ai-") || template.id.startsWith("shared-")) {
      setSharing(true);
      try {
        const response = await fetch("/api/itinerary/share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: template }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "创建分享链接失败");
        url = `${window.location.origin}${payload.url}`;
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "创建分享链接失败，请稍后重试");
        setSharing(false);
        return;
      }
      setSharing(false);
    }

    try {
      await navigator.clipboard.writeText(url);
      setNotice("分享链接已复制，对方打开即可查看完整行程。");
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
          <p className={s.lead}>8 条主题套餐，覆盖登山、非遗、海丝、温泉、古厝、寺庙、海岛与红色研学；也可以按天数、人群和兴趣生成专属路线，详情页会按站点自动解析真实坐标并生成地图路线。</p>
          <div className={s.heroMeta}>
            <span><Route size={15} />8 条套餐</span>
            <span><Sparkles size={15} />AI 定制</span>
            <span><MapIcon size={15} />高德地图路线</span>
            <span><Bookmark size={15} />保存与分享</span>
          </div>
          <p className={s.sourceNote}><Info size={14} />时间为建议安排，开放时间、票价与交通以出行当天为准。</p>
        </section>

        {shareError && <p className={s.shareError} role="alert"><Info size={15} />{shareError}</p>}

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
              <button className={s.generateButton} type="submit" disabled={planning}>
                {planning ? <><LoaderCircle className={s.spinner} size={16} />{planStatus}</> : <><Sparkles size={16} />生成我的路线</>}
              </button>
              <p><Users size={14} />未登录时只按上方条件生成；登录后会读取最近收藏与浏览记录作为偏好。</p>
            </div>
            {planError && <p className={s.planError} role="alert"><Info size={14} />{planError}</p>}
          </form>
        </section>

        {!customPlan && (
          <>
        <section ref={templates} className={s.filterRow} aria-label="按主题筛选">
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
                <div className={s.cover}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={template.cover ?? FALLBACK_COVER} alt={`${template.title}封面`} loading="lazy" />
                  <span className={s.coverTheme}><Icon size={13} />{template.themeShort}</span>
                  <span className={s.coverDuration}><CalendarDays size={12} />{template.durationLabel}</span>
                </div>
                <div className={s.cardBody}>
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
                </div>
              </article>
            );
          })}
        </section>
          </>
        )}

        {applied && (
          <section ref={detail} className={s.detail} style={accentStyle(applied.accent)} aria-label="已套用的行程">
            {applied.cover && (
              <div className={s.detailCover}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={applied.cover} alt={`${applied.title}封面`} />
                <span className={s.detailCoverTag}><MapPin size={13} />{applied.highlight}</span>
              </div>
            )}
            <div className={s.detailInner}>
            <header className={s.detailHead}>
              <div>
                <p className={s.kicker}>
                  {applied.id.startsWith("shared-")
                    ? "好友分享的行程"
                    : applied.id.startsWith("ai-")
                      ? "AI 定制路线"
                      : `已套用套餐 · ${applied.theme}`}
                </p>
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
                {customPlan && (
                  <button className={s.backButton} onClick={backToTemplates}>
                    <ArrowLeft size={15} />{customPlan.id.startsWith("shared-") ? "浏览套餐模板" : "返回模板套用"}
                  </button>
                )}
                <button className={s.saveButton} onClick={() => save(applied)}
                  disabled={savingId === applied.id || (Boolean(saved[applied.id]) && Boolean(user))}>
                  <Bookmark size={15} />{savingId === applied.id ? "保存中…" : saved[applied.id] ? "已保存" : "保存到我的行程"}
                </button>
                <button className={s.shareButton} onClick={() => share(applied)} disabled={sharing}>
                  <Share2 size={15} />{sharing ? "生成分享中…" : "复制分享链接"}
                </button>
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
                  {applied.stops.filter((stop) => stop.day === activeDay).map((stop, index) => {
                    const point = pointByName.get(stop.name);
                    return (
                      <article key={`${stop.day}-${stop.time}-${stop.name}`} className={s.stop}>
                        <div className={s.stopTime}>{stop.time}</div>
                        <div className={s.stopDot}><span>{index + 1}</span></div>
                        <div className={s.stopBody}>
                          <h4>{stop.name}</h4>
                          <p>{stop.activity}</p>
                          {stop.note && <small>{stop.note}</small>}
                          <a href={point?.markerUrl ?? amapUrl(stop.name)} target="_blank" rel="noopener noreferrer">
                            <MapPin size={13} />{point ? "导航到这里" : "在地图中查看"}
                          </a>
                        </div>
                      </article>
                    );
                  })}
                </div>
                <p className={s.timelineNote}><Info size={14} />时间与顺序为模板建议，请按当天开放、交通和体力情况调整。</p>
              </div>

              <aside className={s.side}>
                <div className={s.mapCard}>
                  <div className={s.mapHead}>
                    <Compass size={16} />行程路线图
                    <span>{mapData?.available ? "全程" : "示意图"}</span>
                  </div>

                  {mapLoading ? (
                    <div className={s.mapLoading}><LoaderCircle className={s.spinner} size={18} />正在解析站点坐标…</div>
                  ) : mapData?.available && mapData.imageUrl ? (
                    <>
                      <div className={s.mapFrame}>
                        {/* 地图由本站代理生成，原生 img 可避免图片优化器二次请求 */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={mapData.imageUrl} alt={`${applied.title} 全程路线地图`} />
                        <div className={s.mapPins}>
                          {mapPoints.map((point) => (
                            <a key={`${point.order}-${point.name}`} className={s.mapPin} href={point.markerUrl}
                              target="_blank" rel="noopener noreferrer"
                              style={{
                                left: `${point.x}%`, top: `${point.y}%`, background: point.color,
                                opacity: point.day === activeDay ? 1 : 0.45,
                              }}
                              title={`第${point.day}天 · ${point.name}`}>
                              {point.order}
                            </a>
                          ))}
                        </div>
                      </div>
                      <div className={s.mapLegend}>
                        {mapPoints.map((point) => (
                          <a key={`legend-${point.order}-${point.name}`} href={point.markerUrl} target="_blank" rel="noopener noreferrer">
                            <i style={{ background: point.color }}>{point.order}</i>{point.name}
                          </a>
                        ))}
                      </div>
                      <div className={s.mapMeta}>
                        <span>{mapData.distanceKm ? `全程约 ${(mapData.distanceKm / 1000).toFixed(1)} 公里` : "已解析站点坐标"}</span>
                        {mapData.navigationUrl && (
                          <a href={mapData.navigationUrl} target="_blank" rel="noopener noreferrer"
                            title="高德只支持两点导航，这里打开首站到末站的驾车路线">
                            高德导航（首站→末站）<ArrowRight size={12} />
                          </a>
                        )}
                      </div>
                      <p>{missingPoints.length
                        ? `共 ${missingPoints.length} 个站点未能定位（${missingPoints.map((item) => item.name).join("、")}），已在地图上跳过。`
                        : `编号与时间轴顺序一致；地图只标注站点位置，点编号可单独导航。`}</p>
                    </>
                  ) : (
                    <>
                      <div className={s.mapCanvas}>
                        <span className={s.mapWatermark}>福州</span>
                        <svg className={s.mapPath} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                          <polyline points={(applied.map ?? []).map((stop) => `${stop.x},${stop.y}`).join(" ")}
                            fill="none" stroke="var(--accent)" strokeWidth="0.7" strokeDasharray="2 1.6" strokeLinecap="round" />
                        </svg>
                        {(applied.map ?? []).map((stop, index) => (
                          <a key={`${stop.name}-${index}`} className={s.mapStop} href={amapUrl(stop.name)}
                            target="_blank" rel="noopener noreferrer" style={{ left: `${stop.x}%`, top: `${stop.y}%` }}
                            title={`在高德地图中查看 ${stop.name}`}>
                            <span>{index + 1}</span><b>{stop.name}</b>
                          </a>
                        ))}
                      </div>
                      <p>{mapData?.note || "暂未解析到坐标，以下为示意图；点击站点可在高德地图中搜索位置。"}
                        {applied.stops.length > (applied.map ?? []).length ? " 路线图仅展示前 8 个主要站点。" : ""}</p>
                    </>
                  )}
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
                  <div className={s.summaryList}>
                    {summaryLines.map((line, index) => (
                      <p key={`${line.day}-${index}`}>
                        {line.day > 0 && <b>Day {line.day}</b>}
                        <span>{line.text}</span>
                      </p>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
