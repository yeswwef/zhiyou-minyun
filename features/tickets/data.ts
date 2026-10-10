import { randomBytes, randomInt } from "node:crypto";

export function ticketBookingNo() {
  return `TK${Date.now().toString(36).toUpperCase()}${randomBytes(4).toString("hex").toUpperCase()}`;
}

export function ticketVerifyCode() {
  return String(randomInt(100000, 1_000_000));
}

export function crowdInfo(bookedCount: number, capacity: number) {
  const rate = capacity > 0 ? bookedCount / capacity : 1;
  if (rate >= 0.95) return { level: "FULL", label: "接近满额", color: "red" };
  if (rate >= 0.8) return { level: "CROWDED", label: "较拥挤", color: "orange" };
  if (rate >= 0.5) return { level: "MODERATE", label: "客流适中", color: "amber" };
  return { level: "RELAXED", label: "客流宽松", color: "green" };
}

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
