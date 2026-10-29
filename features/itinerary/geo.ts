/**
 * @module-note features/itinerary/geo.ts
 * 行程地图服务端适配：把行程站点解析为真实坐标，生成高德静态地图参数与导航链接。
 * 密钥只在服务端使用；前端拿到的是坐标与本站的图片代理地址。
 */

const AMAP = "https://restapi.amap.com";
/** 福州 adcode，限定检索范围，避免同名地点落到外地。 */
const FUZHOU_CITY = "350100";
/** 单次最多解析 12 个站点，控制高德配额与静态地图标注密度。 */
export const MAX_MAP_POINTS = 12;

export type ItineraryMapPoint = {
  name: string;
  day: number;
  lat: number;
  lng: number;
  order: number;
};

const CACHE_TTL = 24 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; point: { lat: number; lng: number } | null }>();

/** 与行程模板一致的强调色，用于静态地图折线与前端站点徽标。 */
const DAY_COLORS = ["0xdf6046", "0x4a7c59", "0x3f6f9f", "0xb07a3e", "0x8a5a44"];
const MAP_WIDTH = 750;
const MAP_HEIGHT = 460;

export type MapView = { centerLat: number; centerLng: number; zoom: number; width: number; height: number };

export function amapKey(): string {
  return (process.env.AMAP_WEB_KEY || "").trim();
}

/** 这些词不是地点：清理后命中就直接跳过，避免把「海鲜午餐」定位到市区某家海鲜店。 */
const GENERIC_NAMES = new Set([
  "海鲜", "小吃", "美食", "餐厅", "饭店", "午餐", "晚餐", "早餐", "住宿", "酒店",
  "集合", "自由活动", "出发", "返程", "下山", "上山", "休整", "购物", "跨海大桥",
]);

/** 去掉“午餐/下山”等非地点词，保留可检索的地名。 */
function cleanName(name: string): string {
  const cleaned = name
    .replace(/[（(].*?[)）]/g, "")
    .replace(/(午餐|晚餐|早餐|住宿|返程|出发|集合|休息|自由活动|入住|退房|下山|上山|乘车)/g, "")
    .trim();
  if (cleaned.length < 2 || GENERIC_NAMES.has(cleaned)) return "";
  return cleaned;
}

function parseLocation(value: unknown): { lat: number; lng: number } | null {
  if (typeof value !== "string") return null;
  const [lng, lat] = value.split(",").map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < 3 || lat > 54 || lng < 73 || lng > 136) return null;
  return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
}

async function fetchJson(url: string): Promise<Record<string, unknown>> {
  const response = await fetch(url, { signal: AbortSignal.timeout(6000), cache: "no-store" });
  if (!response.ok) throw new Error(`AMAP_HTTP_${response.status}`);
  return (await response.json()) as Record<string, unknown>;
}

/** 去掉“福州市/公园/景区”等通用后缀，便于比较名称是否指向同一地点。 */
function normalizeName(value: string): string {
  return value
    .replace(/[（(].*?[)）]/g, "")
    .replace(/(福州市|福州|公园|旅游景区|景区|旅游区|度假区|风景名胜区|历史文化街区|文化街区|广场|站)+$/g, "")
    .trim();
}

/** 高德城市中心参考点，用于同名地点择优（越靠近市区越可能是游客目标）。 */
const CITY_CENTER = { lat: 26.0745, lng: 119.2965 };

/**
 * 从候选 POI 中挑选最匹配的一条：名称完全一致 > 互相包含 > 其他，
 * 同分时取离市中心更近的，避免「福州西湖」被解析到远郊同名地点。
 */
function pickBest(list: unknown[], keyword: string): { lat: number; lng: number } | null {
  const target = normalizeName(keyword);
  let best: { lat: number; lng: number } | null = null;
  let bestScore = -1;
  let bestDistance = Infinity;

  for (const entry of list) {
    const poi = entry as Record<string, unknown>;
    const point = parseLocation(poi.location);
    if (!point) continue;
    const name = normalizeName(typeof poi.name === "string" ? poi.name : "");
    const score = name && target
      ? (name === target ? 3 : name.includes(target) || target.includes(name) ? 2 : 1)
      : 1;
    const distance = haversine(CITY_CENTER.lat, CITY_CENTER.lng, point.lat, point.lng);
    if (score > bestScore || (score === bestScore && distance < bestDistance)) {
      best = point;
      bestScore = score;
      bestDistance = distance;
    }
  }
  return best;
}

/** POI 关键字检索优先，失败再走地理编码，兼顾景点、车站与街区。 */
async function geocodeOne(name: string): Promise<{ lat: number; lng: number } | null> {
  const key = amapKey();
  const cached = cache.get(name);
  if (cached && Date.now() - cached.at < CACHE_TTL) return cached.point;

  let point: { lat: number; lng: number } | null = null;

  try {
    const params = new URLSearchParams({
      key, keywords: name, city: FUZHOU_CITY, citylimit: "true", offset: "8", page: "1",
    });
    const data = await fetchJson(`${AMAP}/v3/place/text?${params.toString()}`);
    if (data.status === "1" && Array.isArray(data.pois)) point = pickBest(data.pois, name);
  } catch { /* 转到地理编码接口兜底 */ }

  if (!point) {
    try {
      const params = new URLSearchParams({ key, address: name, city: FUZHOU_CITY });
      const data = await fetchJson(`${AMAP}/v3/geocode/geo?${params.toString()}`);
      const list = Array.isArray(data.geocodes) ? data.geocodes : [];
      point = parseLocation((list[0] as Record<string, unknown> | undefined)?.location);
    } catch { point = null; }
  }

  cache.set(name, { at: Date.now(), point });
  return point;
}

/** 两点的球面距离（米）。 */
export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** 按顺序累加两点之间的直线距离（米）。 */
export function pathDistance(points: ItineraryMapPoint[]): number {
  let total = 0;
  for (let index = 1; index < points.length; index++) {
    total += haversine(points[index - 1].lat, points[index - 1].lng, points[index].lat, points[index].lng);
  }
  return Math.round(total);
}

/** 把当天站点按顺序串起来，算出这一天的直线里程。 */
function dayDistance(points: ItineraryMapPoint[]): number {
  const byDay = new Map<number, ItineraryMapPoint[]>();
  for (const point of points) {
    const list = byDay.get(point.day) ?? [];
    list.push(point);
    byDay.set(point.day, list);
  }
  let total = 0;
  for (const list of byDay.values()) {
    list.sort((a, b) => a.order - b.order);
    total += pathDistance(list);
  }
  return total;
}

/** 解析一组行程站点；识别失败的站点会被跳过并在 missing 中返回。 */
export async function resolveStops(
  stops: { name: string; day: number }[],
): Promise<{ points: ItineraryMapPoint[]; missing: { name: string; day: number }[]; distanceKm: number }> {
  const seen = new Set<string>();
  const targets: { name: string; day: number }[] = [];
  const missing: { name: string; day: number }[] = [];

  for (const stop of stops) {
    const cleaned = cleanName(stop.name);
    if (!cleaned) continue;
    if (seen.has(cleaned)) continue;
    seen.add(cleaned);
    if (targets.length >= MAX_MAP_POINTS) break;
    targets.push({ name: cleaned, day: stop.day });
  }

  const resolved = await Promise.all(targets.map(async (target) => ({
    target, point: await geocodeOne(target.name),
  })));

  const points: ItineraryMapPoint[] = [];
  for (const { target, point } of resolved) {
    if (!point) { missing.push({ name: target.name, day: target.day }); continue; }
    points.push({ name: target.name, day: target.day, lat: point.lat, lng: point.lng, order: points.length + 1 });
  }

  return { points, missing, distanceKm: dayDistance(points) };
}

/** 站点在高德中的定位链接，可唤起 App 或网页地图。 */
export function markerUrl(point: { name: string; lat: number; lng: number }): string {
  const query = new URLSearchParams({
    position: `${point.lng},${point.lat}`,
    name: point.name,
    coordinate: "gaode",
    callnative: "1",
  });
  return `https://uri.amap.com/marker?${query.toString()}`;
}

/** 全程导航链接：首站到末站，驾车模式，出发前可自行改起点。 */
export function navigationUrl(points: ItineraryMapPoint[]): string {
  if (!points.length) return "";
  const first = points[0];
  const last = points[points.length - 1];
  const query = new URLSearchParams({
    from: `${first.lng},${first.lat},${first.name}`,
    to: `${last.lng},${last.lat},${last.name}`,
    mode: "car",
    policy: "1",
    coordinate: "gaode",
    callnative: "1",
    src: "zhiyou-minyun",
  });
  return `https://uri.amap.com/navigation?${query.toString()}`;
}

/** 前端拼图片地址用的紧凑编码：lng,lat,day;lng,lat,day。 */
export function encodePoints(points: ItineraryMapPoint[]): string {
  return points.map((point) => `${point.lng},${point.lat},${point.day}`).join(";");
}

/** 解析并校验紧凑编码，非法坐标直接丢弃，防止把任意参数透传给高德。 */
export function decodePoints(raw: string): ItineraryMapPoint[] {
  const points: ItineraryMapPoint[] = [];
  for (const chunk of raw.split(";")) {
    const [lngRaw, latRaw, dayRaw] = chunk.split(",");
    const lng = Number(lngRaw);
    const lat = Number(latRaw);
    const day = Number(dayRaw);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    if (lng < 73 || lng > 136 || lat < 3 || lat > 54) continue;
    if (points.length >= MAX_MAP_POINTS) break;
    points.push({
      name: "",
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      day: Number.isFinite(day) && day > 0 ? Math.floor(day) : 1,
      order: points.length + 1,
    });
  }
  return points;
}

/** 站点徽标颜色（CSS 十六进制），按天轮换。 */
export function dayColor(day: number): string {
  return `#${DAY_COLORS[(day - 1) % DAY_COLORS.length].slice(2)}`;
}

/** Web 墨卡托归一化坐标，与高德静态地图投影一致。 */
function mercator(lat: number, lng: number): { x: number; y: number } {
  const x = (lng + 180) / 360;
  const y = (1 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / Math.PI) / 2;
  return { x, y };
}

function inverseLat(y: number): number {
  return (Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180) / Math.PI;
}

/** 按所有站点的外包框计算中心与缩放级别，留 20% 边距。 */
export function computeView(points: ItineraryMapPoint[]): MapView {
  const coords = points.map((point) => mercator(point.lat, point.lng));
  const xs = coords.map((item) => item.x);
  const ys = coords.map((item) => item.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 1e-6);
  const spanY = Math.max(maxY - minY, 1e-6);
  const margin = 0.8;
  const raw = Math.log2(Math.min((MAP_WIDTH * margin) / spanX, (MAP_HEIGHT * margin) / spanY) / 256);
  const zoom = Math.min(17, Math.max(3, Math.floor(raw)));
  return {
    centerLat: inverseLat((minY + maxY) / 2),
    centerLng: ((minX + maxX) / 2) * 360 - 180,
    zoom,
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
  };
}

/** 把站点投影为图片内的百分比坐标，供前端叠加编号徽标。 */
export function projectPoints(points: ItineraryMapPoint[], view: MapView) {
  const scale = 256 * 2 ** view.zoom;
  const center = mercator(view.centerLat, view.centerLng);
  const placed: { x: number; y: number }[] = [];
  const clampX = (value: number) => Math.min(97, Math.max(3, value));
  const clampY = (value: number) => Math.min(95, Math.max(5, value));

  return points.map((point) => {
    const coord = mercator(point.lat, point.lng);
    const x = ((coord.x - center.x) * scale + view.width / 2) / view.width * 100;
    const y = ((coord.y - center.y) * scale + view.height / 2) / view.height * 100;

    // 坐标重合或过近的站点做少量错位，避免编号徽标互相遮挡。
    let px = clampX(x);
    let py = clampY(y);
    let attempt = 0;
    while (attempt < 10 && placed.some((item) => Math.hypot(item.x - px, item.y - py) < 4.2)) {
      attempt++;
      const radius = 4.2 * Math.ceil(attempt / 2);
      const angle = (Math.PI / 3) * attempt;
      px = clampX(x + Math.cos(angle) * radius);
      py = clampY(y + Math.sin(angle) * radius);
    }
    placed.push({ x: px, y: py });

    return {
      ...point,
      color: dayColor(point.day),
      x: Number(px.toFixed(2)),
      y: Number(py.toFixed(2)),
    };
  });
}

/** 生成静态地图查询串：只取干净底图，站点连线改由前端按相邻关系绘制。 */
export function staticMapQuery(view: MapView): string {
  return [
    `location=${view.centerLng.toFixed(6)},${view.centerLat.toFixed(6)}`,
    `zoom=${view.zoom}`,
    `size=${view.width}*${view.height}`,
    "scale=2",
  ].join("&");
}
