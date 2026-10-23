/**
 * @module-note app/api/merchant/orders/[id]/route.ts
 * 商户业务／商品订单／指定id接口。HTTP请求进入具名方法后执行校验与业务处理，再以响应返回；权限、错误码和数据范围以各分支为准。
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { orderInclude, toMerchantOrderDto } from "@/features/merchant/data";

/**
 * 商户操作订单：cancel（待支付 → 已取消）。
 * 核销不在这里做——核销需要顾客出示核销码，走 POST /api/merchant/orders/verify。
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "请先登录" }, { status: 401 });
  }

  const { id } = await params;
  const order = await prisma.order.findFirst({
    where: { id, merchantId: userId },
    select: { id: true, status: true },
  });
  if (!order) {
    return NextResponse.json({ ok: false, error: "订单不存在" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const action = String(body?.action ?? "");

  if (action === "cancel") {
    if (order.status !== "PENDING") {
      return NextResponse.json(
        { ok: false, error: "只有「待支付」的订单才能取消" },
        { status: 400 },
      );
    }
    const updated = await prisma.order.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: orderInclude,
    });
    return NextResponse.json({ ok: true, item: toMerchantOrderDto(updated) });
  }

  return NextResponse.json(
    { ok: false, error: "不支持的操作：核销请让顾客出示核销码" },
    { status: 400 },
  );
}
