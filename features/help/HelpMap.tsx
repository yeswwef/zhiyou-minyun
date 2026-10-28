"use client";

/**
 * @module-note features/help/HelpMap.tsx
 * 高德 JS API 地图层：只负责渲染点位、选中气泡和地图控件。
 * 数据、定位与列表联动由 HelpExperience 持有；脚本加载失败时只降级本组件，不影响列表。
 */
import { useEffect, useRef, useState } from "react";
import { LoaderCircle, LocateFixed, Minus, Plus, RefreshCw } from "lucide-react";
import { FACILITY_LABEL, type Facility, type FacilityType } from "./types";
import s from "./help.module.css";

const JS_KEY = (process.env.NEXT_PUBLIC_AMAP_JS_KEY || "").trim();
const SECURITY_CODE = (process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE || "").trim();

type MapStatus = "loading" | "ready" | "error" | "disabled";

type AMapMap = {
  setCenter(position: [number, number]): void;
  setZoomAndCenter(zoom: number, position: [number, number]): void;
  setFitView(overlays?: AMapMarker[], immediately?: boolean, avoid?: number[], maxZoom?: number): void;
  zoomIn(): void;
  zoomOut(): void;
  destroy(): void;
  on(event: string, handler: () => void): void;
};

type AMapMarker = {
  setMap(map: AMapMap | null): void;
  setContent(content: string): void;
  setzIndex(index: number): void;
  on(event: string, handler: () => void): void;
};

type AMapInfoWindow = {
  open(map: AMapMap, position: [number, number]): void;
  close(): void;
  setContent(content: string): void;
};

type AMapNamespace = {
  Map: new (container: HTMLElement, options: Record<string, unknown>) => AMapMap;
  Marker: new (options: Record<string, unknown>) => AMapMarker;
  InfoWindow: new (options: Record<string, unknown>) => AMapInfoWindow;
  Pixel: new (x: number, y: number) => unknown;
};

declare global {
  interface Window {
    AMap?: AMapNamespace;
    _AMapSecurityConfig?: { securityJsCode?: string };
  }
}

let amapPromise: Promise<AMapNamespace> | null = null;

/** 注入高德 JS API 脚本；安全密钥必须在脚本加载前写入。 */
function loadAmap(): Promise<AMapNamespace> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR 环境不加载地图"));
  if (window.AMap) return Promise.resolve(window.AMap);
  if (amapPromise) return amapPromise;
  if (!JS_KEY) return Promise.reject(new Error("未配置地图 Key"));

  window._AMapSecurityConfig = { securityJsCode: SECURITY_CODE };
  amapPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(JS_KEY)}`;
    script.async = true;
    script.onload = () => {
      if (window.AMap) resolve(window.AMap);
      else reject(new Error("地图脚本已加载但 AMap 未就绪"));
    };
    script.onerror = () => {
      amapPromise = null;
      script.remove();
      reject(new Error("地图脚本加载失败"));
    };
    document.head.appendChild(script);
  });
  return amapPromise;
}

const PIN_CLASS: Record<FacilityType, string> = {
  TOILET: s.pinToilet,
  PARKING: s.pinParking,
  CHARGING: s.pinCharging,
  MEDICAL: s.pinMedical,
};

function formatDistance(metres: number): string {
  return metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toFixed(1)} km`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function pinHtml(item: Facility, index: number, active: boolean): string {
  return `<div class="${s.pin} ${PIN_CLASS[item.type]}${active ? ` ${s.pinActive}` : ""}"><span>${index + 1}</span></div>`;
}

function infoHtml(item: Facility, index: number): string {
  const call = item.phone
    ? `<a class="${s.infoCall}" href="tel:${escapeHtml(item.phone)}">电话</a>`
    : "";
  return `<div class="${s.infoCard}">
    <div class="${s.infoHead}">
      <span class="${s.infoIndex} ${PIN_CLASS[item.type]}">${index + 1}</span>
      <div><b>${escapeHtml(item.name)}</b><small>${FACILITY_LABEL[item.type]} · ${formatDistance(item.distance)}</small></div>
    </div>
    <p class="${s.infoAddress}">${escapeHtml(item.address || "地址暂无")}</p>
    <div class="${s.infoActions}">
      <a class="${s.infoNav}" href="${escapeHtml(item.navUrl)}" target="_blank" rel="noopener noreferrer">在高德地图打开</a>
      ${call}
    </div>
  </div>`;
}

type HelpMapProps = {
  items: Facility[];
  selectedId: string | null;
  center: { lat: number; lng: number };
  locating: boolean;
  onSelect: (id: string | null) => void;
  onLocate: () => void;
};

/**
 * 渲染周边设施地图。地图不可用时展示明确的降级提示，不阻塞列表。
 */
export function HelpMap({ items, selectedId, center, locating, onSelect, onLocate }: HelpMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<AMapMap | null>(null);
  const markersRef = useRef<Map<string, AMapMarker>>(new Map());
  const infoRef = useRef<AMapInfoWindow | null>(null);
  const centerRef = useRef(center);
  const [status, setStatus] = useState<MapStatus>(() => (JS_KEY ? "loading" : "disabled"));
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    centerRef.current = center;
  }, [center]);

  // 初始化地图；脚本失败只切换本组件状态。
  useEffect(() => {
    if (!JS_KEY) return;
    const container = containerRef.current;
    if (!container) return;
    let disposed = false;
    let map: AMapMap | undefined;
    const markerRegistry = markersRef.current;

    setStatus("loading");
    loadAmap()
      .then((AMap) => {
        if (disposed || !containerRef.current) return;
        try {
          map = new AMap.Map(containerRef.current, {
            zoom: 15,
            zooms: [10, 18],
            center: [centerRef.current.lng, centerRef.current.lat],
            viewMode: "2D",
            mapStyle: "amap://styles/normal",
            resizeEnable: true,
          });
        } catch {
          setStatus("error");
          return;
        }
        mapRef.current = map;
        setStatus("ready");
      })
      .catch(() => {
        if (!disposed) setStatus("error");
      });

    return () => {
      disposed = true;
      markerRegistry.forEach((marker) => marker.setMap(null));
      markerRegistry.clear();
      infoRef.current?.close();
      infoRef.current = null;
      map?.destroy();
      mapRef.current = null;
    };
  }, [reloadToken]);

  // 定位变化时平移地图，不重建实例。
  useEffect(() => {
    if (status !== "ready") return;
    mapRef.current?.setCenter([center.lng, center.lat]);
  }, [center.lat, center.lng, status]);

  // 点位变化时重建 marker，并按视野自适应。
  useEffect(() => {
    const map = mapRef.current;
    const AMap = window.AMap;
    if (status !== "ready" || !map || !AMap) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current.clear();

    items.forEach((item, index) => {
      const marker = new AMap.Marker({
        position: [item.lng, item.lat],
        anchor: "bottom-center",
        zIndex: 100,
        content: pinHtml(item, index, item.id === selectedId),
      });
      marker.on("click", () => {
        onSelect(item.id);
        // 需求：点击地图上的地点，直接跳到高德地图对应位置（新标签页，保留本页）。
        const opened = window.open(item.navUrl, "_blank");
        if (opened) opened.opener = null;
        else window.location.href = item.navUrl;
      });
      marker.setMap(map);
      markersRef.current.set(item.id, marker);
    });

    const markers = [...markersRef.current.values()];
    if (!markers.length) return;
    if (markers.length === 1) {
      map.setZoomAndCenter(16, [items[0].lng, items[0].lat]);
      return;
    }
    map.setFitView(markers, false, [70, 70, 70, 70], 16);
    // selectedId 变化只更新样式，不重新自适应视野。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, status]);

  // 选中项：更新 marker 样式并打开气泡。
  useEffect(() => {
    if (status !== "ready") return;
    const AMap = window.AMap;
    const map = mapRef.current;
    if (!AMap || !map) return;

    markersRef.current.forEach((marker, id) => {
      const index = items.findIndex((item) => item.id === id);
      const item = items[index];
      if (!item) return;
      const active = id === selectedId;
      marker.setContent(pinHtml(item, index, active));
      marker.setzIndex(active ? 130 : 100);
    });

    if (!selectedId) {
      infoRef.current?.close();
      return;
    }
    const index = items.findIndex((item) => item.id === selectedId);
    const item = items[index];
    if (!item) return;
    if (!infoRef.current) {
      infoRef.current = new AMap.InfoWindow({
        isCustom: true,
        offset: new AMap.Pixel(0, -38),
        closeWhenClickMap: true,
        autoMove: true,
      });
    }
    infoRef.current.setContent(infoHtml(item, index));
    infoRef.current.open(map, [item.lng, item.lat]);
  }, [selectedId, items, status]);

  function retry() {
    amapPromise = null;
    setReloadToken((value) => value + 1);
  }

  return (
    <>
      <div ref={containerRef} className={s.mapCanvas} role="application" aria-label="周边设施地图" />

      {status === "loading" && (
        <div className={s.mapState}>
          <LoaderCircle size={22} className={s.spinner} />
          <span>地图加载中…</span>
        </div>
      )}

      {(status === "error" || status === "disabled") && (
        <div className={s.mapFallback}>
          <span className={s.mapFallbackIcon}><MapPinnedIcon /></span>
          <strong>{status === "disabled" ? "未配置地图 Key" : "地图暂不可用"}</strong>
          <span>设施列表仍可正常使用，导航不受影响。</span>
          {status === "error" && (
            <button type="button" className={s.mapRetry} onClick={retry}>
              <RefreshCw size={14} />重试
            </button>
          )}
        </div>
      )}

      {status === "ready" && (
        <>
          <div className={s.mapCount}>
            <b>{items.length}</b> 个点位
          </div>
          <div className={s.mapLegend} aria-hidden="true">
            {(["TOILET", "PARKING", "CHARGING", "MEDICAL"] as FacilityType[]).map((type) => (
              <span key={type}><i className={PIN_CLASS[type]} />{FACILITY_LABEL[type]}</span>
            ))}
          </div>
          <div className={s.mapHint}>点击点位 · 在高德地图打开</div>
          <div className={s.mapControls}>
            <button type="button" onClick={() => mapRef.current?.zoomIn()} aria-label="放大地图"><Plus size={16} /></button>
            <button type="button" onClick={() => mapRef.current?.zoomOut()} aria-label="缩小地图"><Minus size={16} /></button>
            <button type="button" onClick={onLocate} aria-label="定位到我的位置" disabled={locating}>
              <LocateFixed size={16} />
            </button>
          </div>
        </>
      )}
    </>
  );
}

/** 降级态图标；避免额外依赖，用内联 SVG。 */
function MapPinnedIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  );
}
