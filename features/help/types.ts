/**
 * @module-note features/help/types.ts
 * 便民与应急：设施类型、天气快照与求助工单的类型定义。
 * 台风预警本期不实现，天气只提供实况与 3 天预报。
 */

/** 四类便民设施；与前端 Tab、种子数据、高德关键词一一对应。 */
export const FACILITY_TYPES = ["TOILET", "PARKING", "CHARGING", "MEDICAL"] as const;
export type FacilityType = (typeof FACILITY_TYPES)[number];

/** 设施的分类中文名与图标语义，前端直接用。 */
export const FACILITY_LABEL: Record<FacilityType, string> = {
  TOILET: "公共厕所",
  PARKING: "停车场",
  CHARGING: "充电桩",
  MEDICAL: "医疗点",
};

/** 一条设施记录；distance 单位为米，由服务端按用户坐标算好。 */
export type Facility = {
  id: string;
  type: FacilityType;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distance: number;
  phone?: string;
  /** 高德 URI：点击直接唤起地图导航，无需额外 key。 */
  navUrl: string;
};

/** 数据来源：amap 为真实 POI，seed 为内置示例数据。 */
export type FacilitySource = "amap" | "seed";

export type FacilitiesResponse = {
  source: FacilitySource;
  type: FacilityType;
  count: number;
  items: Facility[];
  /** 降级原因，前端用于显示提示条。 */
  note?: string;
};

/** 实况天气；high/low 仅预报有。 */
export type WeatherNow = {
  province: string;
  city: string;
  adcode: string;
  weather: string;
  temperature: string;
  windDirection: string;
  windPower: string;
  humidity: string;
  reportTime: string;
};

/** 单日预报。 */
export type WeatherCast = {
  date: string;
  week: string;
  dayWeather: string;
  nightWeather: string;
  dayTemp: string;
  nightTemp: string;
  dayWind: string;
  dayPower: string;
  nightWind: string;
  nightPower: string;
};

export type WeatherResponse = {
  ok: boolean;
  /** 无 key 或接口失败时为 true，此时 now/casts 可能为空。 */
  degraded: boolean;
  note?: string;
  now?: WeatherNow;
  casts?: WeatherCast[];
  /** 本次响应是命中缓存还是实时拉取，便于前端提示“数据可能缓存 10 分钟”。 */
  cached?: boolean;
};

/** 求助类型。 */
export const EMERGENCY_KINDS = ["MEDICAL", "LOST", "TRAPPED", "OTHER"] as const;
export type EmergencyKind = (typeof EMERGENCY_KINDS)[number];

export const EMERGENCY_LABEL: Record<EmergencyKind, string> = {
  MEDICAL: "需要医疗救助",
  LOST: "与同行人走失",
  TRAPPED: "受困 / 无法离开",
  OTHER: "其他紧急情况",
};

/** 提交求助的请求体。 */
export type EmergencyInput = {
  kind: EmergencyKind;
  lat: number;
  lng: number;
  accuracy?: number;
  note?: string;
  phone?: string;
};

/** 求助结果：工单号 + 就近可拨号码。 */
export type EmergencyResponse = {
  ticketId: string;
  kind: EmergencyKind;
  createdAt: string;
  nearest: Facility[];
  /** 固定免责声明，前端必须展示。 */
  disclaimer: string;
};

/** 统一的坐标校验：中国境外或明显非法值直接拒绝。 */
export function isValidCoordinate(lat: unknown, lng: unknown): boolean {
  if (typeof lat !== "number" || typeof lng !== "number") return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return lat > 3 && lat < 54 && lng > 73 && lng < 136;
}
