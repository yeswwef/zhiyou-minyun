/**
 * @module-note app/api/orders/[id]/route.ts
 * 商品订单／指定id接口。HTTP请求进入具名方法后执行校验与业务处理，再以响应返回；权限、错误码和数据范围以各分支为准。
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { guardVisitor } from "@/lib/roles";
import { orderInclude, toOrderDto } from "@/features/merchant/data";

/**
 * 买家操作自己的订单：
 * - pay：待支付 → 已支付（模拟支付，生成核销码）
 * - cancel：待支付 → 已取消（归还库存）
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardVisitor();
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const { id } = await params;
  const order = await prisma.order.findFirst({
    where: { id, buyerId: userId },
    select: { id: true, status: true, productId: true, quantity: true },
  });
  if (!order) {
    return NextResponse.json({ ok: false, error: "订单不存在" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const action = String(body?.action ?? "");

  if (action === "pay") {
    if (order.status !== "PENDING") {
      return NextResponse.json({ ok: false, error: "订单状态已变更" }, { status: 400 });
    }
    const updated = await prisma.order.update({
      where: { id },
      data: { status: "PAID", paidAt: new Date() },
      include: orderInclude,
    });
    return NextResponse.json({ ok: true, item: toOrderDto(updated) });
  }

  if (action === "cancel") {
    if (order.status !== "PENDING") {
      return NextResponse.json({ ok: false, error: "订单状态已变更" }, { status: 400 });
    }
    const updated = await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: order.productId },
        data: { stock: { increment: order.quantity } },
      });
      return tx.order.update({
        where: { id },
        data: { status: "CANCELLED" },
        include: orderInclude,
      });
    });
    return NextResponse.json({ ok: true, item: toOrderDto(updated) });
  }

  return NextResponse.json({ ok: false, error: "不支持的操作" }, { status: 400 });
}
