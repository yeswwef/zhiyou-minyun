/**
 * @module-note app/api/merchant/dashboard/route.ts
 * 商户业务／数据总览接口。HTTP请求进入具名方法后执行校验与业务处理，再以响应返回；权限、错误码和数据范围以各分支为准。
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { productCategoryLabel, type ProductCategoryValue } from "@/features/merchant/types";

/** 商户经营 / 客流看板 */
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "请先登录" }, { status: 401 });
  }

  const [products, orders, enrollments, works, classes] = await Promise.all([
    prisma.product.findMany({
      where: { merchantId: userId },
      select: { id: true, status: true },
    }),
    prisma.order.findMany({
      where: { merchantId: userId },
      select: {
        amount: true,
        status: true,
        quantity: true,
        createdAt: true,
        buyer: { select: { id: true, username: true, nickname: true } },
        product: { select: { category: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.classEnrollment.findMany({
      where: { class: { is: { merchantId: userId } } },
      select: { status: true, createdAt: true },
    }),
    prisma.studioWork.count({ where: { merchantId: userId } }),
    prisma.experienceClass.count({ where: { merchantId: userId } }),
  ]);

  const byStatus = { PENDING: 0, PAID: 0, VERIFIED: 0, CANCELLED: 0 };
  let revenue = 0;
  for (const order of orders) {
    byStatus[order.status] += 1;
    if (order.status === "PAID" || order.status === "VERIFIED") {
      revenue += order.amount;
    }
  }

  // 近 7 天客流趋势
  const days: Array<{ key: string; label: string; orders: number; revenue: number; enrollments: number }> = [];
  for (let i = 6; i >= 0; i -= 1) {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - i);
    days.push({
      key: day.toISOString().slice(0, 10),
      label: `${day.getMonth() + 1}/${day.getDate()}`,
      orders: 0,
      revenue: 0,
      enrollments: 0,
    });
  }
  const dayIndex = new Map(days.map((day) => [day.key, day]));

  for (const order of orders) {
    const key = order.createdAt.toISOString().slice(0, 10);
    const day = dayIndex.get(key);
    if (!day) continue;
    day.orders += 1;
    if (order.status === "PAID" || order.status === "VERIFIED") day.revenue += order.amount;
  }
  for (const enrollment of enrollments) {
    const key = enrollment.createdAt.toISOString().slice(0, 10);
    const day = dayIndex.get(key);
    if (day) day.enrollments += 1;
  }

  // 游客画像：消费档位
  const buyerTotals = new Map<string, { name: string; amount: number; orders: number }>();
  for (const order of orders) {
    if (order.status !== "PAID" && order.status !== "VERIFIED") continue;
    const current = buyerTotals.get(order.buyer.id) ?? {
      name: order.buyer.nickname || order.buyer.username,
      amount: 0,
      orders: 0,
    };
    current.amount += order.amount;
    current.orders += 1;
    buyerTotals.set(order.buyer.id, current);
  }
  const buyers = [...buyerTotals.values()];
  const tiers = [
    { label: "高消费（≥500元）", count: buyers.filter((b) => b.amount >= 50000).length },
    {
      label: "中消费（100-500元）",
      count: buyers.filter((b) => b.amount >= 10000 && b.amount < 50000).length,
    },
    { label: "低消费（<100元）", count: buyers.filter((b) => b.amount < 10000).length },
  ];

  // 游客画像：类别偏好
  const categoryCount = new Map<ProductCategoryValue, number>();
  for (const order of orders) {
    const key = order.product.category;
    categoryCount.set(key, (categoryCount.get(key) ?? 0) + 1);
  }
  const categories = [...categoryCount.entries()]
    .map(([value, count]) => ({ label: productCategoryLabel(value), count }))
    .sort((a, b) => b.count - a.count);

  const topBuyers = buyers
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map((buyer) => ({
      name: buyer.name,
      orders: buyer.orders,
      amountYuan: Number((buyer.amount / 100).toFixed(2)),
    }));

  return NextResponse.json({
    ok: true,
    summary: {
      productTotal: products.length,
      productPublished: products.filter((item) => item.status === "PUBLISHED").length,
      orderTotal: orders.length,
      orderByStatus: byStatus,
      revenueYuan: Number((revenue / 100).toFixed(2)),
      enrollmentTotal: enrollments.length,
      enrollmentPending: enrollments.filter((item) => item.status === "PENDING").length,
      workTotal: works,
      classTotal: classes,
    },
    trend: days.map((day) => ({
      label: day.label,
      orders: day.orders,
      revenueYuan: Number((day.revenue / 100).toFixed(2)),
      enrollments: day.enrollments,
    })),
    profile: { tiers, categories, topBuyers },
  });
}
