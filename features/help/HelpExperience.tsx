/**
 * @module-note features/help/HelpExperience.tsx
 * 便民与应急展示层：定位、四类设施查询、天气条、一键求助工单。
 * 台风预警与闭园公告本期未实现，页面不展示相关入口。
 */
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle, ArrowLeft, BatteryCharging, CheckCircle2, ChevronDown, Cloud, CloudRain, Hospital,
  LoaderCircle, MapPin, Navigation, ParkingCircle, Phone, RefreshCw, ShieldCheck, Sun, Toilet, X,
} from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import {
  EMERGENCY_KINDS, EMERGENCY_LABEL, FACILITY_LABEL, FACILITY_TYPES,
  type EmergencyKind, type EmergencyResponse, type Facility, type FacilitySource,
  type FacilityType, type WeatherResponse,
} from "./types";
import s from "./help.module.css";

/** 定位失败时的默认中心点：三坊七巷。 */
const DEFAULT_CENTER = { lat: 26.0818, lng: 119.2949 };

const TABS: { type: FacilityType; icon: typeof Toilet }[] = [
  { type: "TOILET", icon: Toilet },
  { type: "PARKING", icon: ParkingCircle },
  { type: "CHARGING", icon: BatteryCharging },
  { type: "MEDICAL", icon: Hospital },
];

/** 距离展示：1km 内按米，否则保留一位小数。 */
function formatDistance(metres: number): string {
  return metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toFixed(1)} km`;
}

/** 按天气文案挑一个图标，仅用于视觉区分。 */
function weatherIcon(text: string) {
  if (/雨|雷/.test(text)) return CloudRain;
  if (/云|阴/.test(text)) return Cloud;
  return Sun;
}

/**
 * 便民与应急页面：定位、设施列表、天气与求助弹层。
 */
export function HelpExperience() {
  const [type, setType] = useState<FacilityType>("TOILET");
  const [coords, setCoords] = useState(DEFAULT_CENTER);
  const [geo, setGeo] = useState<"idle" | "locating" | "ok" | "denied">("idle");
  const [items, setItems] = useState<Facility[]>([]);
  const [source, setSource] = useState<FacilitySource>("seed");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [weatherOpen, setWeatherOpen] = useState(false);
  const [weatherRefreshing, setWeatherRefreshing] = useState(false);

  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<EmergencyKind>("MEDICAL");
  const [noteText, setNoteText] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ticket, setTicket] = useState<EmergencyResponse | null>(null);
  const [submitError, setSubmitError] = useState("");

  const inFlight = useRef(false);

  /** 请求浏览器定位；失败时退回三坊七巷并提示用户。 */
  const locate = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeo("denied");
      return;
    }
    setGeo("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setGeo("ok");
      },
      () => setGeo("denied"),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  }, []);

  useEffect(() => { locate(); }, [locate]);

  // 支持首页深链：?type=PARKING 直接切到对应 Tab，?help=1 自动打开求助弹层。
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = (params.get("type") || "").toUpperCase();
    if ((FACILITY_TYPES as readonly string[]).includes(requested)) setType(requested as FacilityType);
    if (params.get("help") === "1") openHelp();
    // 只在首次挂载时读取一次，避免后续 state 变化重复触发。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 天气只在进入页面时取一次；失败不影响设施查询。
  useEffect(() => {
    let alive = true;
    fetch("/api/help/weather", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: WeatherResponse) => { if (alive) setWeather(data); })
      .catch(() => { if (alive) setWeather({ ok: false, degraded: true, note: "天气服务暂不可用" }); });
    return () => { alive = false; };
  }, []);

  // 类型或坐标变化时重新查询设施。
  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (inFlight.current) return;
      inFlight.current = true;
      setLoading(true);
      setError("");
      setNote("");
      try {
        const query = new URLSearchParams({
          type,
          lat: String(coords.lat),
          lng: String(coords.lng),
          radius: "2000",
        });
        const response = await fetch(`/api/help/facilities?${query.toString()}`, { cache: "no-store" });
        const data = await response.json() as {
          source?: FacilitySource; items?: Facility[]; note?: string; error?: string;
        };
        if (!response.ok) throw new Error(data.error || "设施查询失败");
        if (!alive) return;
        setItems(data.items ?? []);
        setSource(data.source ?? "seed");
        setNote(data.note ?? "");
      } catch (reason) {
        if (!alive) return;
        setItems([]);
        setError(reason instanceof Error ? reason.message : "设施查询失败，请稍后重试");
      } finally {
        if (alive) setLoading(false);
        inFlight.current = false;
      }
    };
    void run();
    return () => { alive = false; };
  }, [type, coords.lat, coords.lng]);

  /** 手动刷新天气：?refresh=1 跳过服务端 10 分钟缓存。 */
  async function refreshWeather() {
    if (weatherRefreshing) return;
    setWeatherRefreshing(true);
    try {
      const response = await fetch("/api/help/weather?refresh=1", { cache: "no-store" });
      const data = await response.json() as WeatherResponse;
      setWeather(data);
    } catch {
      // 刷新失败时保留旧数据，不清空界面。
    } finally {
      setWeatherRefreshing(false);
    }
  }

  /** 打开求助弹层时清空上一次结果。 */
  function openHelp() {
    setTicket(null);
    setSubmitError("");
    setNoteText("");
    setPhone("");
    setKind("MEDICAL");
    setOpen(true);
  }

  /** 提交求助工单；失败时保留弹层与已填内容。 */
  async function submitHelp() {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const response = await fetch("/api/help/emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          lat: coords.lat,
          lng: coords.lng,
          note: noteText.trim() || undefined,
          phone: phone.trim() || undefined,
        }),
        signal: AbortSignal.timeout(30000),
      });
      const data = await response.json() as EmergencyResponse & { error?: string };
      if (!response.ok) throw new Error(data.error || "提交失败，请直接拨打 110 / 120");
      setTicket(data);
    } catch (reason) {
      setSubmitError(reason instanceof Error ? reason.message : "提交失败，请直接拨打 110 / 120");
    } finally {
      setSubmitting(false);
    }
  }

  const WeatherIcon = useMemo(() => weatherIcon(weather?.now?.weather ?? ""), [weather?.now?.weather]);
  const activeLabel = FACILITY_LABEL[type];

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
        <Link href="/home" className={s.back}><ArrowLeft size={16} />返回首页</Link>
      </header>

      <main className={s.main}>
        <section className={s.hero}>
          <p className={s.kicker}>TRAVEL HELP · 便民与应急</p>
          <h1>在路上更安心，<em>随手可查</em></h1>
          <p className={s.lead}>厕所、停车、充电、医疗四类设施一键查找，按距离排序并可直接导航；遇到紧急情况可登记求助工单并拨打就近电话。</p>
          <div className={s.tags}>
            <span>福州城区</span>
            <span>距离优先</span>
            <span>可导航</span>
          </div>
        </section>

        {/* 天气条：实况 + 3 天预报；点「详情」展开完整数据 */}
        <section className={s.weatherBar} aria-label="福州天气">
          {weather?.ok && weather.now ? (
            <>
              <div className={s.weatherRow}>
                <div className={s.weatherMain}>
                  <span className={s.weatherIcon}><WeatherIcon size={24} /></span>
                  <div>
                    <strong>{weather.now.temperature}°</strong>
                    <small>{weather.now.city} · {weather.now.weather} · {weather.now.windDirection}风 {weather.now.windPower} 级</small>
                  </div>
                </div>
                <div className={s.forecast}>
                  {(weather.casts ?? []).map((cast) => (
                    <div key={cast.date} className={s.cast}>
                      <b>{cast.week} {cast.date.slice(5)}</b>
                      <span>{cast.dayWeather}</span>
                      <small>{cast.nightTemp}° / {cast.dayTemp}°</small>
                    </div>
                  ))}
                </div>
                <button
                  className={s.weatherMore}
                  onClick={() => setWeatherOpen((value) => !value)}
                  aria-expanded={weatherOpen}
                >
                  {weatherOpen ? "收起" : "详情"}
                  <ChevronDown size={15} className={weatherOpen ? s.chevOpen : ""} />
                </button>
              </div>

              {weatherOpen && (
                <div className={s.weatherDetail}>
                  <div className={s.weatherStats}>
                    <div><span>天气</span><b>{weather.now.weather}</b></div>
                    <div><span>气温</span><b>{weather.now.temperature}°C</b></div>
                    <div><span>风向</span><b>{weather.now.windDirection}</b></div>
                    <div><span>风力</span><b>{weather.now.windPower} 级</b></div>
                    <div><span>湿度</span><b>{weather.now.humidity}%</b></div>
                    <div><span>观测时间</span><b>{weather.now.reportTime}</b></div>
                  </div>

                  <div className={s.weatherTableWrap}>
                    <table className={s.weatherTable}>
                      <thead>
                        <tr><th>日期</th><th>白天</th><th>夜间</th><th>最低 / 最高</th><th>白天风</th><th>夜间风</th></tr>
                      </thead>
                      <tbody>
                        {(weather.casts ?? []).map((cast) => (
                          <tr key={cast.date}>
                            <td>{cast.date.slice(5)} {cast.week}</td>
                            <td>{cast.dayWeather}</td>
                            <td>{cast.nightWeather}</td>
                            <td>{cast.nightTemp}° / {cast.dayTemp}°</td>
                            <td>{cast.dayWind} {cast.dayPower} 级</td>
                            <td>{cast.nightWind} {cast.nightPower} 级</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className={s.weatherFoot}>
                    <span>
                      来源：高德地图 Web 服务「天气查询」· {weather.now.province}{weather.now.city}
                      · adcode {weather.now.adcode} · {weather.cached ? "服务端缓存（10 分钟内）" : "刚刚更新"}
                    </span>
                    <button className={s.refreshBtn} onClick={refreshWeather} disabled={weatherRefreshing}>
                      <RefreshCw size={13} className={weatherRefreshing ? s.spinner : ""} />
                      {weatherRefreshing ? "刷新中…" : "刷新"}
                    </button>
                  </div>
                  <p className={s.weatherNote}>
                    该接口提供实况与未来 3 天预报，不含逐小时预报、空气质量与灾害预警。
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className={s.weatherDegraded}>
              <CloudRain size={18} />
              <span>{weather?.degraded ? (weather.note || "天气服务暂不可用") : "正在获取天气…"}</span>
            </div>
          )}
        </section>

        {/* 四类设施 Tab */}
        <div className={s.tabs} role="tablist" aria-label="设施类型">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.type}
                role="tab"
                aria-selected={type === tab.type}
                className={`${s.tab} ${type === tab.type ? s.tabActive : ""}`}
                onClick={() => setType(tab.type)}
              >
                <span className={s.tabIcon}><Icon size={17} /></span>
                {FACILITY_LABEL[tab.type]}
              </button>
            );
          })}
        </div>

        <div className={s.listHead}>
          <h2>附近{activeLabel}</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <small>
              {geo === "locating" ? "正在定位…" : geo === "denied" ? "未获得定位，按三坊七巷中心查找" : "已按当前位置排序"}
            </small>
            <span className={`${s.badgeSource} ${source === "amap" ? s.badgeAmap : s.badgeSeed}`}>
              {source === "amap" ? "高德实时数据" : "内置示例数据"}
            </span>
          </div>
        </div>

        {note && (
          <p className={s.noteBar}><AlertCircle size={14} /><span>{note}</span></p>
        )}

        {loading ? (
          <div className={s.stateBox}>
            <span className={s.stateIcon}><LoaderCircle size={26} className={s.spinner} /></span>
            <strong>正在查找附近{activeLabel}</strong>
            <span>按当前位置计算距离并排序，通常 1 秒内完成。</span>
          </div>
        ) : error ? (
          <div className={`${s.stateBox} ${s.errorBox}`}>
            <span className={s.stateIcon}><AlertCircle size={26} /></span>
            <strong>查询失败</strong>
            <span>{error}</span>
          </div>
        ) : items.length === 0 ? (
          <div className={s.stateBox}>
            <span className={s.stateIcon}><MapPin size={26} /></span>
            <strong>附近 2 公里内没有找到{activeLabel}</strong>
            <span>可以尝试切换到其他设施类型，或放宽查找范围。</span>
          </div>
        ) : (
          <div className={s.facilityList}>
            {items.map((item) => (
              <article key={item.id} className={s.facilityCard}>
                <div className={s.facTop}>
                  <h3 className={s.facName}>{item.name}</h3>
                  <span className={s.facDistance}>{formatDistance(item.distance)}</span>
                </div>
                <p className={s.facMeta}>{item.address || "地址暂无"}</p>
                <div className={s.facActions}>
                  <a className={s.navBtn} href={item.navUrl} target="_blank" rel="noopener noreferrer">
                    <Navigation size={14} />导航
                  </a>
                  {item.phone && (
                    <a className={s.callBtn} href={`tel:${item.phone}`}>
                      <Phone size={14} />{item.phone}
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <button className={s.helpFab} onClick={openHelp}>
        <ShieldCheck size={19} />一键求助
      </button>

      {open && (
        <div className={s.mask} role="dialog" aria-modal="true" aria-label="一键求助">
          <div className={s.modal}>
            <div className={s.modalHead}>
              <div>
                <h2>{ticket ? "求助已登记" : "一键求助"}</h2>
                <p>{ticket ? "请同时联系下方就近电话或拨打 110 / 120" : "填写后可获得工单号与就近医疗点电话"}</p>
              </div>
              <button className={s.closeBtn} onClick={() => setOpen(false)} aria-label="关闭">
                <X size={16} />
              </button>
            </div>

            <div className={s.modalBody}>
              {ticket ? (
                <>
                  <div className={s.ticket}>
                    <div className={s.ticketHead}>
                      <CheckCircle2 size={18} />工单已创建
                    </div>
                    <p className={s.ticketId}>工单号：{ticket.ticketId}</p>
                    <p className={s.ticketId}>
                      位置：{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)} · {EMERGENCY_LABEL[ticket.kind]}
                    </p>
                    <div className={s.nearestList}>
                      {ticket.nearest.map((item) => (
                        <div key={item.id} className={s.nearestRow}>
                          <span>
                            <b>{item.name}</b>
                            <small>{formatDistance(item.distance)} · {item.address || "地址暂无"}</small>
                          </span>
                          {item.phone
                            ? <a className={s.callBtn} href={`tel:${item.phone}`}><Phone size={13} />拨打</a>
                            : <a className={s.navBtn} href={item.navUrl} target="_blank" rel="noopener noreferrer"><Navigation size={13} />导航</a>}
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className={s.disclaimer}>{ticket.disclaimer}</p>
                  <div className={s.modalActions}>
                    <button className={s.submitBtn} onClick={() => setOpen(false)}>完成</button>
                  </div>
                </>
              ) : (
                <>
                  <div className={s.kindGrid}>
                    {EMERGENCY_KINDS.map((item) => (
                      <button
                        key={item}
                        className={`${s.kindOption} ${kind === item ? s.kindActive : ""}`}
                        onClick={() => setKind(item)}
                      >
                        {EMERGENCY_LABEL[item]}
                      </button>
                    ))}
                  </div>

                  <div className={s.locationLine}>
                    <MapPin size={14} />
                    {geo === "ok"
                      ? `已获取定位：${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
                      : "未获取精确定位，将使用三坊七巷中心点；可点击「重新定位」"}
                    {geo !== "ok" && (
                      <button className={s.navBtn} onClick={locate} disabled={geo === "locating"}>
                        {geo === "locating" ? "定位中…" : "重新定位"}
                      </button>
                    )}
                  </div>

                  <div className={s.field}>
                    <label htmlFor="help-note">补充说明（可选）</label>
                    <textarea
                      id="help-note"
                      className={s.textarea}
                      maxLength={500}
                      placeholder="例如：在三坊七巷南后街中段，同行老人身体不适"
                      value={noteText}
                      onChange={(event) => setNoteText(event.target.value)}
                    />
                  </div>

                  <div className={s.field}>
                    <label htmlFor="help-phone">联系电话（可选）</label>
                    <input
                      id="help-phone"
                      className={s.input}
                      placeholder="便于工作人员回拨"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                    />
                  </div>

                  {submitError && (
                    <p className={s.noteBar} role="alert"><AlertCircle size={14} /><span>{submitError}</span></p>
                  )}

                  <p className={s.disclaimer}>
                    本工单仅在本平台登记，<b>不接入 110 / 120 调度系统</b>。情况紧急请直接拨打 110（报警）或 120（急救）。
                  </p>

                  <div className={s.modalActions}>
                    <button className={s.cancelBtn} onClick={() => setOpen(false)} disabled={submitting}>取消</button>
                    <button className={s.submitBtn} onClick={submitHelp} disabled={submitting}>
                      {submitting ? <><LoaderCircle size={16} className={s.spinner} />提交中…</> : <><ShieldCheck size={16} />提交求助</>}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
