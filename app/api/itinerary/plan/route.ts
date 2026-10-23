/**
 * @module-note app/api/itinerary/plan/route.ts
 * AI 路线智能推荐：按天数、人群、节奏、兴趣和登录用户的历史偏好生成福州行程。
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { chatStructured, modelReady, parseJson } from "@/features/rag/providers";
import { acquire } from "@/features/rag/limits";
import { readBody } from "@/features/rag/http";
import { ragLog, safeError, withRagLog } from "@/features/rag/logger";
import { ITINERARY_TEMPLATES, type ItineraryTemplate } from "@/features/itinerary/templates";

export const runtime = "nodejs";
export const maxDuration = 180;

const AUDIENCES = ["亲子", "研学", "自驾", "老年"] as const;
const PACES = ["轻松", "适中", "紧凑"] as const;
const INTERESTS = ["历史文化", "非遗手作", "美食", "自然山水", "拍照", "温泉", "红色研学"] as const;
const GENERIC_STOP = /午餐|晚餐|早餐|住宿|返程|出发|集合|休息|自由活动|入住|退房|前往|返回/;

const ACCENTS: Record<string, string> = {
  亲子: "#3f7d5a", 研学: "#2f6f8f", 自驾: "#b07a3e", 老年: "#8a5a44",
};

const CANDIDATES = [...new Set([
  ...ITINERARY_TEMPLATES.flatMap((template) => template.attractions),
  ...ITINERARY_TEMPLATES.flatMap((template) => template.stops.map((stop) => stop.name)),
  "华林寺", "镇海楼", "金山寺", "朱紫坊", "福州文庙", "梁厝", "嵩口古镇", "闽江河口湿地",
  "屏山公园", "林阳寺", "瑞岩山", "灵石山", "三叠井", "日溪峡谷", "飞云峡", "雪峰山城罗汉台",
  "长乐猴屿洞天岩", "罗源湾海洋世界", "奇达村", "北港村", "坛南湾", "平潭岛",
])];

const SYSTEM = `你是福州本地行程规划师。根据用户的天数、人群、节奏、兴趣和历史偏好，生成可执行的福州旅游路线。必须遵守：
1. 只能从候选景点列表中选择景点，不得编造候选列表之外的景点或地点。
2. 天数必须等于用户输入；每天安排 3-6 个站点（轻松 3-4，适中 4-5，紧凑 5-6），按时间顺序，包含午餐或晚餐。
3. 人群适配：
- 亲子：少爬坡、多互动和非遗体验，安排休息。
- 研学：博物馆、船政、非遗、历史街区，突出知识点。
- 自驾：可安排永泰、福清、长乐、罗源等近郊，注明车程。
- 老年：低强度、少台阶、多休息，避免夜游和长时间步行。
4. 历史偏好只作为加权，不要强行全部塞入；用户明确选择的兴趣优先。
5. 不要编造实时票价、开放时间、余票或已经执行的操作；在 warnings 中列出需要核实的事项。
6. 路线要按地理位置尽量顺路，不要一天内反复跨城。
7. 只返回 JSON：{"title":"路线标题","summary":"一句话说明","days":[{"day":1,"theme":"当天主题","stops":[{"time":"09:00","name":"景点名","activity":"活动说明","note":"可选提示"}]}],"food":["美食"],"transport":"交通建议","warnings":["需核实事项"]}
8. 不输出 JSON 以外的解释、代码块或 Markdown。`;

type PlanStop = { time: string; name: string; activity: string; note?: string };
type PlanDay = { day: number; theme: string; stops: PlanStop[] };
type PlanDraft = { title: string; summary: string; days: PlanDay[]; food: string[]; transport: string; warnings: string[] };

/** 是否为候选景点或午餐、返程等通用站点，防止模型编造地点。 */
function isKnownStop(name: string) {
  const value = name.replace(/[（(].*?[)）]/g, "").trim();
  if (!value) return false;
  if (GENERIC_STOP.test(value)) return true;
  return CANDIDATES.some((candidate) => value.includes(candidate) || candidate.includes(value));
}

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** 校验模型输出的天数、站点、时间、候选景点和字段长度。 */
function validatePlan(value: unknown, daysCount: number): PlanDraft {
  const row = value as Record<string, unknown>;
  if (!row || typeof row !== "object") throw new Error("INVALID_PLAN");
  const title = text(row.title, 80);
  const summary = text(row.summary, 400);
  if (!title) throw new Error("INVALID_PLAN");
  if (!Array.isArray(row.days) || row.days.length !== daysCount) throw new Error("INVALID_PLAN");

  const days = row.days.map((item, index) => {
    const day = item as Record<string, unknown>;
    if (Number(day.day) !== index + 1) throw new Error("INVALID_PLAN");
    if (!Array.isArray(day.stops) || day.stops.length < 2 || day.stops.length > 7) throw new Error("INVALID_PLAN");
    const stops: PlanStop[] = day.stops.map((entry) => {
      const stop = entry as Record<string, unknown>;
      const time = text(stop.time, 20);
      if (!/^\d{1,2}:\d{2}(?:-\d{1,2}:\d{2})?$/.test(time)) throw new Error("INVALID_PLAN");
      const name = text(stop.name, 50);
      if (!name || !isKnownStop(name)) throw new Error("INVALID_PLAN_ATTRACTION");
      const activity = text(stop.activity, 200);
      if (!activity) throw new Error("INVALID_PLAN");
      const note = text(stop.note, 140);
      return { time, name, activity, ...(note ? { note } : {}) };
    });
    stops.sort((a, b) => a.time.localeCompare(b.time));
    return { day: index + 1, theme: text(day.theme, 60) || `第${index + 1}天`, stops };
  });

  const food = Array.isArray(row.food)
    ? row.food.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
      .map((item) => item.trim().slice(0, 30)).slice(0, 8)
    : [];
  const warnings = Array.isArray(row.warnings)
    ? row.warnings.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
      .map((item) => item.trim().slice(0, 120)).slice(0, 6)
    : [];
  return { title, summary, days, food, transport: text(row.transport, 400), warnings };
}

/** 读取登录用户最近的收藏和浏览资源，作为历史偏好。 */
async function historyPreferences(userId: string | null) {
  if (!userId) return [];
  try {
    const [favorites, views] = await Promise.all([
      prisma.favorite.findMany({
        where: { userId }, orderBy: { createdAt: "desc" }, take: 6,
        include: { resource: { select: { title: true } } },
      }),
      prisma.resourceView.findMany({
        where: { userId }, orderBy: { viewedAt: "desc" }, take: 8,
        include: { resource: { select: { title: true } } },
      }),
    ]);
    return [...new Set([...favorites, ...views].map((row) => row.resource.title))].slice(0, 8);
  } catch {
    return [];
  }
}

/** 用站点顺序生成示意图坐标，最多展示 8 个主要站点。 */
function buildMap(stops: { name: string }[]) {
  return stops.slice(0, 8).map((stop, index) => ({
    name: stop.name,
    x: 16 + (index % 4) * 22,
    y: 24 + Math.floor(index / 4) * 36,
  }));
}

/** 处理 AI 路线生成请求。 */
export async function POST(req: NextRequest) {
  return withRagLog(async () => {
    const origin = req.headers.get("origin");
    if (origin && origin !== req.nextUrl.origin) {
      return NextResponse.json({ error: "不接受跨站请求" }, { status: 403 });
    }

    let raw: string;
    try { raw = await readBody(req, 16 * 1024); } catch {
      return NextResponse.json({ error: "请求过大或无法读取" }, { status: 413 });
    }
    let body: Record<string, unknown>;
    try { body = JSON.parse(raw) as Record<string, unknown>; } catch {
      return NextResponse.json({ error: "JSON格式错误" }, { status: 400 });
    }

    const daysCount = Math.min(5, Math.max(1, Math.floor(Number(body.days) || 1)));
    const audience = AUDIENCES.includes(body.audience as (typeof AUDIENCES)[number]) ? String(body.audience) : "亲子";
    const pace = PACES.includes(body.pace as (typeof PACES)[number]) ? String(body.pace) : "适中";
    const interests = Array.isArray(body.interests)
      ? body.interests.filter((item): item is string => typeof item === "string" && INTERESTS.includes(item as (typeof INTERESTS)[number])).slice(0, 5)
      : [];

    if (!modelReady()) {
      return NextResponse.json({ error: "行程生成服务未配置模型" }, { status: 503 });
    }

    let userId: string | null = null;
    try { userId = await getSessionUserId(); } catch { userId = null; }
    const key = `itinerary:${userId ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "guest"}`;
    const release = acquire(key);
    if (!release) {
      return NextResponse.json({ error: "生成请求过于频繁，请稍后重试" }, { status: 429, headers: { "Retry-After": "60" } });
    }

    try {
      const history = await historyPreferences(userId);
      const payload = JSON.stringify({
        days: daysCount,
        audience,
        pace,
        interests,
        historyPreferences: history,
        candidateAttractions: CANDIDATES,
        routeReferences: ITINERARY_TEMPLATES.map((template) => ({ theme: template.theme, route: template.routeSummary })),
      });

      let draft: PlanDraft | undefined;
      let correction = "";
      for (let attempt = 0; attempt < 2; attempt++) {
        const content = await chatStructured(SYSTEM, `${payload}\n${correction}\n只返回 JSON。`, 3200);
        try {
          draft = validatePlan(parseJson(content), daysCount);
          break;
        } catch (error) {
          const code = error instanceof Error ? error.message : "INVALID_PLAN";
          if (/MODEL_HTTP_|MODEL_NOT_CONFIGURED|fetch failed|timeout|aborted/i.test(code)) throw error;
          ragLog("itinerary.retry", { attempt: attempt + 1, code }, "WARN");
          correction = "上次输出未通过校验。请确保天数完全一致、每天 3-6 个站点、时间格式为 HH:MM，并且所有景点名都来自 candidateAttractions。";
          if (attempt === 1) throw new Error("INVALID_PLAN");
        }
      }
      if (!draft) throw new Error("INVALID_PLAN");

      const stops = draft.days.flatMap((day) => day.stops.map((stop) => ({ day: day.day, ...stop })));
      const attractions = [...new Set(stops.map((stop) => stop.name))].slice(0, 12);
      const plan: ItineraryTemplate = {
        id: `ai-${Date.now()}`,
        theme: "AI 定制路线",
        themeShort: "AI",
        title: draft.title,
        subtitle: draft.summary || `${audience} · ${pace} · ${interests.join("、")}`,
        durationDays: daysCount,
        durationLabel: `${daysCount} 天`,
        suitable: `${audience} · ${pace}`,
        highlight: attractions.slice(0, 3).join(" · "),
        routeSummary: draft.days.map((day) => `Day${day.day} ${day.stops.map((stop) => stop.name).join(" → ")}`).join("；"),
        attractions,
        food: draft.food.length ? draft.food : ["鱼丸", "锅边糊", "芋泥"],
        transport: draft.transport || "建议按区域选择地铁、公交或自驾，出发前查询班次。",
        stops,
        map: buildMap(stops),
        accent: ACCENTS[audience] ?? "#c05a3e",
        note: `AI 根据${audience}、${pace}节奏和${interests.join("、") || "综合"}偏好生成；开放时间、票价与交通请出行前核实。`,
      };
      if (draft.warnings.length) plan.note = `${plan.note} ${draft.warnings.join("；")}`;

      ragLog("itinerary.complete", { days: daysCount, audience, pace, personalized: history.length > 0, stops: stops.length });
      return NextResponse.json({ plan, personalized: history.length > 0, historyCount: history.length });
    } catch (error) {
      const code = error instanceof Error ? error.message : "UNKNOWN";
      if (code === "INVALID_PLAN" || code === "INVALID_PLAN_ATTRACTION") {
        return NextResponse.json({ error: "暂时无法生成符合条件的路线，请调整天数、人群或兴趣后重试" }, { status: 422 });
      }
      if (code === "MODEL_NOT_CONFIGURED" || /^MODEL_HTTP_/.test(code)) {
        return NextResponse.json({ error: "模型服务暂时不可用，请稍后重试" }, { status: 503 });
      }
      ragLog("itinerary.error", { code: safeError(error) }, "ERROR");
      return NextResponse.json({ error: "生成路线失败，请稍后重试" }, { status: 500 });
    } finally {
      release();
    }
  });
}
