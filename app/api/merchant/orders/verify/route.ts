/**
 * @module-note app/api/merchant/orders/verify/route.ts
 * 商户业务／商品订单／核销接口。HTTP请求进入具名方法后执行校验与业务处理，再以响应返回；权限、错误码和数据范围以各分支为准。
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { orderInclude, toMerchantOrderDto } from "@/features/merchant/data";

/**
 * 核销：商户向顾客索取核销码后在这里输入。
 * 只有「已支付」的订单、且核销码属于本商户，才能核销成功。
 */
export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "请先登录" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const code = String(body?.code ?? "").trim();
  if (!/^\d{4,8}$/.test(code)) {
    return NextResponse.json({ ok: false, error: "请让顾客出示 6 位核销码" }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: { verifyCode: code, merchantId: userId },
    select: { id: true, status: true },
  });
  if (!order) {
    return NextResponse.json({ ok: false, error: "核销码无效或不属于本店" }, { status: 404 });
  }
  if (order.status === "VERIFIED") {
    return NextResponse.json({ ok: false, error: "该核销码已经核销过了" }, { status: 400 });
  }
  if (order.status !== "PAID") {
    return NextResponse.json(
      { ok: false, error: "该订单不是待核销状态，无法核销" },
      { status: 400 },
    );
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status: "VERIFIED", verifiedAt: new Date() },
    include: orderInclude,
  });

  return NextResponse.json({ ok: true, item: toMerchantOrderDto(updated) });
}
