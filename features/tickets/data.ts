/**
 * @module-note features/tickets/data.ts
 * 票务基础能力：时段数据转换与缓存减压；库存正确性仍由预约接口数据库事务保证。
 */
import { randomBytes, randomInt } from "node:crypto";

/**
 * 生成票务预约业务编号。
 */
export function ticketBookingNo() {
  return `TK${Date.now().toString(36).toUpperCase()}${randomBytes(4).toString("hex").toUpperCase()}`;
}

/**
 * 生成票务预约核销码。
 */
export function ticketVerifyCode() {
  return String(randomInt(100000, 1_000_000));
}

/**
 * 根据已约数量和容量计算拥挤等级；不是现场实时人流监测。
 * 输入：bookedCount、capacity；类型与可选项见函数签名。
 */
export function crowdInfo(bookedCount: number, capacity: number) {
  const rate = capacity > 0 ? bookedCount / capacity : 1;
  if (rate >= 0.95) return { level: "FULL", label: "接近满额", color: "red" };
  if (rate >= 0.8) return { level: "CROWDED", label: "较拥挤", color: "orange" };
  if (rate >= 0.5) return { level: "MODERATE", label: "客流适中", color: "amber" };
  return { level: "RELAXED", label: "客流宽松", color: "green" };
}

/**
 * 将预约时段转换为含余量及拥挤提示的返回数据。
 * 输入：slot；类型与可选项见函数签名。
 */
export function slotDto(slot: {
  id: string;
  startAt: Date;
  endAt: Date;
  capacity: number;
  bookedCount: number;
  warningThreshold: number;
  status: string;
}) {
  return {
    ...slot,
    startAt: slot.startAt.toISOString(),
    endAt: slot.endAt.toISOString(),
    remaining: Math.max(0, slot.capacity - slot.bookedCount),
    crowd: crowdInfo(slot.bookedCount, slot.capacity),
  };
}
