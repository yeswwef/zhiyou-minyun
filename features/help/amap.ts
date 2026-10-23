/**
 * @module-note features/help/amap.ts
 * 高德 Web 服务适配：周边 POI 检索、实况天气与 3 天预报、导航 URI。
 * 有 AMAP_WEB_KEY 时走真实数据；无 key 或接口异常时回落到内置种子数据，
 * 保证「设施可查找」这条验收不被外部依赖卡死。
 */
import { ragLog } from "@/features/rag/logger";
import { SEED_FACILITIES } from "./seed";
import type { Facility, FacilitySource, FacilityType, WeatherCast, WeatherResponse } from "./types";

const AMAP = "https://restapi.amap.com";
/** 福州城市编码；高德天气接口按 adcode 查询。 */
export const FUZHOU_ADCODE = "350100";

export function amapKey(): string {
  return (process.env.AMAP_WEB_KEY || "").trim();
}

/** 仅表示本地配置齐全，不代表 key 有效或配额充足。 */
export function amapReady(): boolean {
  return Boolean(amapKey());
}

/** 两类检索关键词：高德用关键词比分类码更稳，分类码各版本存在差异。 */
const KEYWORDS: Record<FacilityType, string> = {
  TOILET: "公共厕所",
  PARKING: "停车场",
  CHARGING: "充电桩",
  MEDICAL: "医院",
};

/** 球面距离（米）。用于服务端算好距离后按远近排序。 */
export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

/** 高德 URI：无需 key，手机端唤起高德/浏览器地图并定位到目标点。 */
export function navUrl(lat: number, lng: number, name: string): string {
  const query = new URLSearchParams({
    position: `${lng},${lat}`,
    name,
    coordinate: "gaode",
    callnative: "1",
  });
  return `https://uri.amap.com/marker?${query.toString()}`;
}

/** 简单 TTL 缓存，保护高德免费配额（同一网格 10 分钟内不重复请求）。 */
const cache = new Map<string, { at: number; value: unknown }>();
const TTL = 10 * 60 * 1000;

function cacheGet<T>(key: string): T | undefined {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.at > TTL) {
    cache.delete(key);
    return undefined;
  }
  return hit.value as T;
}

function cacheSet(key: string, value: unknown) {
  // 简单容量控制，避免长时间运行后无限增长。
  if (cache.size > 200) cache.clear();
  cache.set(key, { at: Date.now(), value });
}

type AmapPoi = {
  id?: string;
  name?: string;
  address?: string | string[];
  location?: string;
  tel?: string | string[];
  distance?: string;
};

type AmapAround = { status?: string; info?: string; infocode?: string; pois?: AmapPoi[] };

/** 把高德 POI 归一化为前端结构；缺坐标的条目直接丢弃。 */
function toFacility(poi: AmapPoi, type: FacilityType, lat: number, lng: number): Facility | null {
  const name = typeof poi.name === "string" ? poi.name.trim() : "";
  const loc = typeof poi.location === "string" ? poi.location.split(",") : [];
  const plng = Number(loc[0]);
  const plat = Number(loc[1]);
  if (!name || !Number.isFinite(plat) || !Number.isFinite(plng)) return null;
  const address = Array.isArray(poi.address) ? poi.address.join(" ") : poi.address || "";
  const tel = Array.isArray(poi.tel) ? poi.tel[0] : poi.tel;
  return {
    id: poi.id || `${plat},${plng},${name}`,
    type,
    name,
    address: address.trim(),
    lat: plat,
    lng: plng,
    distance: haversine(lat, lng, plat, plng),
    phone: typeof tel === "string" && tel.trim() ? tel.trim() : undefined,
    navUrl: navUrl(plat, plng, name),
  };
}

/** 种子数据同样算距离并排序；先按半径过滤，半径内为空时退回最近的若干条并标记 expanded。 */
function seedFacilities(
  type: FacilityType,
  lat: number,
  lng: number,
  limit: number,
  radius: number,
): { items: Facility[]; expanded: boolean } {
  const all = SEED_FACILITIES.filter((item) => item.type === type)
    .map((item) => ({
      id: `seed:${item.type}:${item.name}`,
      type: item.type,
      name: item.name,
      address: item.address,
      lat: item.lat,
      lng: item.lng,
      distance: haversine(lat, lng, item.lat, item.lng),
      phone: item.phone,
      navUrl: navUrl(item.lat, item.lng, item.name),
    }))
    .sort((a, b) => a.distance - b.distance);

  const within = all.filter((item) => item.distance <= radius);
  if (within.length) return { items: within.slice(0, limit), expanded: false };
  // 半径内没有示例数据时，不假装“附近有”，而是明确告知扩大了范围。
  return { items: all.slice(0, limit), expanded: true };
}

/** 周边设施检索；任何上游异常都返回种子数据而不是抛错，前端只需看 source。 */
export async function nearbyFacilities(
  type: FacilityType,
  lat: number,
  lng: number,
  radius = 2000,
  limit = 12,
): Promise<{ source: FacilitySource; items: Facility[]; note?: string }> {
  if (!amapReady()) {
    const seed = seedFacilities(type, lat, lng, limit, radius);
    return {
      source: "seed",
      items: seed.items,
      note: seed.expanded
        ? `未配置高德 key，${Math.round(radius / 1000)} 公里内无示例数据，以下为最近的 ${seed.items.length} 条`
        : "未配置高德 key，当前为内置示例数据",
    };
  }

  // 坐标按 ~500m 网格取整做缓存键，避免用户轻微移动就重新请求。
  const grid = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  const key = `poi:${type}:${grid}:${radius}`;
  const cached = cacheGet<Facility[]>(key);
  if (cached) return { source: "amap", items: cached };

  const params = new URLSearchParams({
    key: amapKey(),
    location: `${lng},${lat}`,
    keywords: KEYWORDS[type],
    radius: String(radius),
    offset: "25",
    page: "1",
    extensions: "base",
  });

  try {
    const response = await fetch(`${AMAP}/v3/place/around?${params.toString()}`, {
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`AMAP_HTTP_${response.status}`);
    const data = (await response.json()) as AmapAround;
    if (data.status !== "1" || !Array.isArray(data.pois)) throw new Error(`AMAP_${data.infocode || "FAILED"}`);

    const items = data.pois
      .map((poi) => toFacility(poi, type, lat, lng))
      .filter((item): item is Facility => item !== null)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);

    if (!items.length) throw new Error("AMAP_EMPTY");
    cacheSet(key, items);
    ragLog("help.poi", { type, count: items.length, radius });
    return { source: "amap", items };
  } catch (error) {
    const code = error instanceof Error ? error.message : "AMAP_UNKNOWN";
    ragLog("help.poi.fallback", { type, code: code.slice(0, 60) }, "WARN");
    const seed = seedFacilities(type, lat, lng, limit, radius);
    return {
      source: "seed",
      items: seed.items,
      note: seed.expanded
        ? `高德接口暂不可用，${Math.round(radius / 1000)} 公里内无数据，以下为最近的 ${seed.items.length} 条`
        : "高德接口暂不可用，已切换为内置示例数据",
    };
  }
}

type AmapLive = { status?: string; infocode?: string; lives?: Record<string, string>[] };
type AmapForecast = { status?: string; infocode?: string; forecasts?: { casts?: Record<string, string>[] }[] };

/** 实况 + 3 天预报；无 key 时返回 degraded，前端显示"暂不可用"。 */
export async function fuzhouWeather(force = false): Promise<WeatherResponse> {
  if (!amapReady()) {
    return { ok: false, degraded: true, note: "未配置高德 key，天气暂不可用" };
  }

  const cacheKey = `weather:${FUZHOU_ADCODE}`;
  // force=true 时绕过缓存，供用户手动刷新。
  if (!force) {
    const cached = cacheGet<WeatherResponse>(cacheKey);
    if (cached) return { ...cached, cached: true };
  }

  const build = (extensions: "base" | "all") => {
    const params = new URLSearchParams({
      key: amapKey(),
      city: FUZHOU_ADCODE,
      extensions,
    });
    return fetch(`${AMAP}/v3/weather/weatherInfo?${params.toString()}`, {
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
  };

  try {
    const [liveRes, castRes] = await Promise.all([build("base"), build("all")]);
    if (!liveRes.ok || !castRes.ok) throw new Error("AMAP_WEATHER_HTTP");

    const live = (await liveRes.json()) as AmapLive;
    const cast = (await castRes.json()) as AmapForecast;
    if (live.status !== "1" || !Array.isArray(live.lives) || !live.lives.length) throw new Error("AMAP_WEATHER_INVALID");

    const row = live.lives[0];
    const casts: WeatherCast[] = (cast.forecasts?.[0]?.casts ?? []).slice(0, 3).map((c) => ({
      date: c.date ?? "",
      week: c.week ?? "",
      dayWeather: c.dayweather ?? "",
      nightWeather: c.nightweather ?? "",
      dayTemp: c.daytemp ?? "",
      nightTemp: c.nighttemp ?? "",
      dayWind: c.daywind ?? "",
      dayPower: c.daypower ?? "",
      nightWind: c.nightwind ?? "",
      nightPower: c.nightpower ?? "",
    }));

    const value: WeatherResponse = {
      ok: true,
      degraded: false,
      now: {
        province: row.province ?? "福建省",
        city: row.city ?? "福州",
        adcode: row.adcode ?? FUZHOU_ADCODE,
        weather: row.weather ?? "",
        temperature: row.temperature ?? "",
        windDirection: row.winddirection ?? "",
        windPower: row.windpower ?? "",
        humidity: row.humidity ?? "",
        reportTime: row.reporttime ?? "",
      },
      casts,
    };
    cacheSet(cacheKey, value);
    return { ...value, cached: false };
  } catch (error) {
    const code = error instanceof Error ? error.message : "AMAP_WEATHER_UNKNOWN";
    ragLog("help.weather.fallback", { code: code.slice(0, 60) }, "WARN");
    return { ok: false, degraded: true, note: "天气服务暂不可用" };
  }
}
