import "dotenv/config";
import { prisma } from "../lib/db";
import { hashPassword } from "../lib/auth";

const dayAt = (days: number, hour: number) => {
  const value = new Date();
  value.setDate(value.getDate() + days);
  value.setHours(hour, 0, 0, 0);
  return value;
};

async function main() {
  const admin = await prisma.user.upsert({
    where: { username: "demo_admin" },
    update: { role: "ADMIN", nickname: "票务管理员" },
    create: { username: "demo_admin", nickname: "票务管理员", passwordHash: hashPassword("demo123456"), role: "ADMIN" },
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
  console.log("票务演示数据已写入：admin demo_admin / demo123456");
}

main().finally(() => prisma.$disconnect());
