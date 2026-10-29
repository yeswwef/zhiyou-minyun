/**
 * @module-note app/api/admin/commerce/route.ts
 * 平台管理中心：商户、商品与全平台订单接口。
 */
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { guardAdmin } from "@/lib/roles";

/** 查询商户、商品与订单，并给出交易概览。 */
export async function GET() {
  const guard = await guardAdmin();
  if (!guard.ok) return guard.response;

  const [merchants, products, orders, revenue] = await Promise.all([
    prisma.user.findMany({
      where: { role: "B" },
      select: {
        id: true, username: true, nickname: true, merchantName: true, createdAt: true,
        _count: { select: { products: true, merchantOrders: true, studioWorks: true, experienceClasses: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.findMany({
      include: {
        merchant: { select: { username: true, nickname: true, merchantName: true } },
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.order.findMany({
      include: {
        product: { select: { title: true, price: true, unit: true } },
        merchant: { select: { username: true, nickname: true, merchantName: true } },
        buyer: { select: { username: true, nickname: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.order.aggregate({ _sum: { amount: true }, where: { status: { in: ["PAID", "VERIFIED"] } } }),
  ]);

  const paidOrders = orders.filter((order) => order.status === "PAID" || order.status === "VERIFIED");
  return NextResponse.json({
    ok: true,
    merchants,
    products,
    orders,
    stats: {
      merchants: merchants.length,
      products: products.length,
      orders: orders.length,
      paidOrders: paidOrders.length,
      revenue: revenue._sum.amount ?? 0,
    },
  });
}

/** 上架或下架商品；订单只读，避免与商户核销流程冲突。 */
export async function PATCH(req: NextRequest) {
  const guard = await guardAdmin();
  if (!guard.ok) return guard.response;

  let body: { id?: unknown; status?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "请求格式错误" }, { status: 400 }); }
  const id = typeof body.id === "string" ? body.id : "";
  const status = body.status === "PUBLISHED" || body.status === "DRAFT" ? body.status : null;
  if (!id || !status) return NextResponse.json({ ok: false, error: "商品或状态不合法" }, { status: 400 });

  const data = await prisma.product.update({ where: { id }, data: { status }, select: { id: true, status: true } });
  revalidatePath("/shop");
  revalidatePath("/admin/commerce");
  return NextResponse.json({ ok: true, data });
}
