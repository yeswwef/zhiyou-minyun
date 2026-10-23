/**
 * @module-note features/help/emergency.ts
 * 一键求助：登记工单并返回就近医疗点电话。
 * 边界：不接入公安/急救调度，只做本地登记与引导，必须向用户明示。
 */
import { prisma } from "@/lib/db";
import { ragLog } from "@/features/rag/logger";
import { nearbyFacilities } from "./amap";
import type { EmergencyInput, EmergencyResponse } from "./types";

/** 固定免责声明；前端必须原样展示，不允许省略。 */
export const EMERGENCY_DISCLAIMER =
  "本工单仅在本平台登记，不接入 110 / 120 调度系统。情况紧急请直接拨打 110（报警）或 120（急救）。";

/**
 * 创建求助工单，并并行查询附近医疗点。
 * 不记录精确坐标到日志，避免位置信息外泄。
 */
export async function createEmergency(
  input: EmergencyInput,
  userId: string | null = null,
): Promise<EmergencyResponse> {
  // 先查就近医疗点：即使工单落库失败，也能把可拨号码返回给用户。
  const nearby = await nearbyFacilities("MEDICAL", input.lat, input.lng, 5000, 3);

  const row = await prisma.emergencyRequest.create({
    data: {
      userId,
      kind: input.kind,
      lat: input.lat,
      lng: input.lng,
      accuracy: input.accuracy ?? null,
      note: input.note ? input.note.slice(0, 500) : null,
      phone: input.phone ? input.phone.slice(0, 30) : null,
    },
    select: { id: true, createdAt: true },
  });

  // 只记录类型与来源，不记录坐标与备注原文。
  ragLog("help.emergency.created", {
    kind: input.kind,
    hasNote: Boolean(input.note),
    medicalSource: nearby.source,
    nearest: nearby.items.length,
  });

  return {
    ticketId: row.id,
    kind: input.kind,
    createdAt: row.createdAt.toISOString(),
    nearest: nearby.items,
    disclaimer: EMERGENCY_DISCLAIMER,
  };
}
