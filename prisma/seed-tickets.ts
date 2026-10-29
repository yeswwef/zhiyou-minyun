﻿﻿﻿/**
 * @module-note prisma/seed-tickets.ts
 * 数据库初始化脚本：用于开发演示数据，运行会写入数据库，不能当作只读检查。
 */
import "dotenv/config";
import { prisma } from "../lib/db";
import { hashPassword } from "../lib/auth";

/**
 * 计算指定日期偏移和时间的种子时段。
 * 输入：days、hour；类型与可选项见函数签名。
 */
const dayAt = (days: number, hour: number) => {
  const value = new Date();
  value.setDate(value.getDate() + days);
  value.setHours(hour, 0, 0, 0);
  return value;
};

/**
 * 执行 seed-tickets.ts 的命令行主流程，初始化依赖并处理最终结果。
 * 数据库操作：prisma.user.upsert、prisma.venue.findFirst、prisma.venue.create、prisma.ticketItem.findFirst、prisma.ticketItem.create、prisma.ticketSlot.count；注意相应的归属过滤与事务边界。
 */
async function main() {
  const admin = await prisma.user.upsert({
    where: { username: "demo_admin" },
    update: { role: "ADMIN", nickname: "平台管理员" },
    create: { username: "demo_admin", nickname: "平台管理员", passwordHash: hashPassword("demo123456"), role: "ADMIN" },
  });

  await prisma.user.upsert({
    where: { username: "demo_ticket" },
    update: { role: "TICKET_ADMIN", nickname: "景点管理员", passwordHash: hashPassword("demo123456") },
    create: { username: "demo_ticket", nickname: "景点管理员", passwordHash: hashPassword("demo123456"), role: "TICKET_ADMIN" },
  });

  const venueSeeds = [
    { name: "三坊七巷历史文化街区", type: "SCENIC" as const, address: "福州市鼓楼区南后街", image: "/images/sanfangqixiang.jpg" },
    { name: "福州市博物馆", type: "MUSEUM" as const, address: "福州市晋安区文博路8号", image: "/images/zhenhailou.jpg" },
    { name: "海峡文化艺术中心", type: "PERFORMANCE" as const, address: "福州市仓山区南江滨东大道", image: "/images/yantaishan.jpg" },
  ];
  const venues = [];
  for (const seed of venueSeeds) {
    const found = await prisma.venue.findFirst({ where: { name: seed.name } });
    venues.push(found ?? await prisma.venue.create({ data: seed }));
  }

  const ticketSeeds = [
    { venueId: venues[0].id, title: "三坊七巷名人故居联票预约", summary: "一次预约参观街区内严复故居、二梅书屋等代表性文化空间。", description: "以坊巷为脉络，了解近代福州名人故事与古厝营造技艺。", notice: "请按预约时段提前 15 分钟到达；每个账号单次最多预约 5 人。", image: venues[0].image },
    { venueId: venues[1].id, title: "闽都文化常设展预约", summary: "免费预约参观，从史前文明到近现代城市发展认识福州。", description: "常设展以考古发现、城市变迁与民俗生活为主线。", notice: "免费预约，无需支付；请携带有效证件。", image: venues[1].image },
    { venueId: venues[2].id, title: "闽剧经典折子戏惠民演出", summary: "精选闽剧经典折子戏，感受福州方言与传统戏曲魅力。", description: "面向市民与游客的文化惠民场次。", notice: "预约成功后凭核销码入场，对号入座。", image: venues[2].image },
  ];
  for (let index = 0; index < ticketSeeds.length; index += 1) {
    const seed = ticketSeeds[index];
    let ticket = await prisma.ticketItem.findFirst({ where: { title: seed.title } });
    ticket ??= await prisma.ticketItem.create({ data: { ...seed, createdByAdminId: admin.id, status: "OPEN" } });
    const futureCount = await prisma.ticketSlot.count({ where: { ticketItemId: ticket.id, startAt: { gt: new Date() } } });
    if (!futureCount) {
      for (let day = 1; day <= 4; day += 1) {
        const startAt = dayAt(day, index === 2 ? 19 : day % 2 ? 9 : 14);
        const endAt = new Date(startAt.getTime() + (index === 2 ? 120 : 90) * 60_000);
        const capacity = index === 2 ? 280 : 120;
        await prisma.ticketSlot.create({ data: { ticketItemId: ticket.id, startAt, endAt, capacity, bookedCount: day === 2 ? Math.floor(capacity * 0.72) : Math.floor(capacity * 0.25) } });
      }
    }
  }
  // 演示预约：让管理端的预约核销页有可查询、可核销的真实记录。
  const buyers = await prisma.user.findMany({
    where: { username: { in: ["demo_buyer_chen", "demo_buyer_lin", "demo_buyer_su", "demo_lin", "demo_arong"] } },
    select: { id: true, username: true, nickname: true },
  });
  const slots = await prisma.ticketSlot.findMany({
    where: { startAt: { gt: new Date() } },
    orderBy: { startAt: "asc" },
    take: 12,
    select: { id: true, capacity: true, bookedCount: true },
  });
  const bookingSeeds = [
    { id: "demo-booking-1", bookingNo: "ZY-DEMO-001", verifyCode: "573901", username: "demo_buyer_chen", quantity: 2, contactName: "陈小雨", contactPhone: "13800001234", status: "CONFIRMED" as const },
    { id: "demo-booking-2", bookingNo: "ZY-DEMO-002", verifyCode: "284615", username: "demo_buyer_lin", quantity: 3, contactName: "林海", contactPhone: "13900002345", status: "VERIFIED" as const },
    { id: "demo-booking-3", bookingNo: "ZY-DEMO-003", verifyCode: "638204", username: "demo_buyer_su", quantity: 1, contactName: "苏文", contactPhone: "13700005678", status: "CONFIRMED" as const },
    { id: "demo-booking-4", bookingNo: "ZY-DEMO-004", verifyCode: "915732", username: "demo_buyer_chen", quantity: 2, contactName: "陈小雨", contactPhone: "13800001234", status: "VERIFIED" as const },
    { id: "demo-booking-5", bookingNo: "ZY-DEMO-005", verifyCode: "407318", username: "demo_buyer_lin", quantity: 1, contactName: "林海", contactPhone: "13900002345", status: "CANCELLED" as const },
    { id: "demo-booking-6", bookingNo: "ZY-DEMO-006", verifyCode: "760541", username: "demo_buyer_su", quantity: 2, contactName: "苏文", contactPhone: "13700005678", status: "CONFIRMED" as const },
    { id: "demo-booking-7", bookingNo: "ZY-DEMO-007", verifyCode: "318467", username: "demo_buyer_chen", quantity: 2, contactName: "陈小雨", contactPhone: "13800001234", status: "CONFIRMED" as const },
    { id: "demo-booking-8", bookingNo: "ZY-DEMO-008", verifyCode: "502984", username: "demo_buyer_lin", quantity: 1, contactName: "林海", contactPhone: "13900002345", status: "VERIFIED" as const },
    { id: "demo-booking-9", bookingNo: "ZY-DEMO-009", verifyCode: "641073", username: "demo_buyer_su", quantity: 2, contactName: "苏文", contactPhone: "13700005678", status: "CONFIRMED" as const },
    { id: "demo-booking-10", bookingNo: "ZY-DEMO-010", verifyCode: "829516", username: "demo_buyer_chen", quantity: 1, contactName: "陈小雨", contactPhone: "13800001234", status: "CANCELLED" as const },
    { id: "demo-booking-11", bookingNo: "ZY-DEMO-011", verifyCode: "374915", username: "demo_lin", quantity: 2, contactName: "林同学", contactPhone: "13600007890", status: "CONFIRMED" as const },
    { id: "demo-booking-12", bookingNo: "ZY-DEMO-012", verifyCode: "806247", username: "demo_arong", quantity: 1, contactName: "阿榕", contactPhone: "13500008901", status: "VERIFIED" as const },
  ];
  for (let index = 0; index < bookingSeeds.length; index += 1) {
    const seed = bookingSeeds[index];
    const buyer = buyers.find((item) => item.username === seed.username);
    const slot = slots[index];
    if (!buyer || !slot) continue;
    const exists = await prisma.ticketBooking.findUnique({ where: { id: seed.id }, select: { id: true } });
    if (exists) continue;
    await prisma.ticketBooking.create({
      data: {
        id: seed.id,
        bookingNo: seed.bookingNo,
        verifyCode: seed.verifyCode,
        userId: buyer.id,
        slotId: slot.id,
        quantity: seed.quantity,
        contactName: seed.contactName,
        contactPhone: seed.contactPhone,
        status: seed.status,
        verifiedAt: seed.status === "VERIFIED" ? new Date() : null,
        cancelledAt: seed.status === "CANCELLED" ? new Date() : null,
      },
    });
    // 取消的预约不占用场次容量。
    if (seed.status !== "CANCELLED") {
      await prisma.ticketSlot.update({
        where: { id: slot.id },
        data: { bookedCount: { increment: seed.quantity } },
      });
    }
  }

  console.log("票务演示数据已写入：平台管理员 demo_admin / demo123456；景点管理员 demo_ticket / demo123456");
}

main().finally(() => prisma.$disconnect());

