/**
 * @module-note app/api/orders/route.ts
 * 商品订单接口。HTTP请求进入具名方法后执行校验与业务处理，再以响应返回；权限、错误码和数据范围以各分支为准。
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { guardVisitor } from "@/lib/roles";
import {
  createOrderNo,
  createVerifyCode,
  orderInclude,
  toOrderDto,
} from "@/features/merchant/data";

/**
 * 生成并检查订单核销码，避免与现有有效记录重复。
 * 数据库操作：prisma.order.findUnique；注意相应的归属过滤与事务边界。
 */
async function uniqueVerifyCode() {
  for (let i = 0; i < 5; i += 1) {
    const code = createVerifyCode();
    const exists = await prisma.order.findUnique({
      where: { verifyCode: code },
      select: { id: true },
    });
    if (!exists) return code;
  }
  return String(Date.now()).slice(-6);
}

/** C 端：我的订单 */
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: true, data: [], loggedIn: false });
  }

  const orders = await prisma.order.findMany({
    where: { buyerId: userId },
    include: orderInclude,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ ok: true, loggedIn: true, data: orders.map(toOrderDto) });
}

/** C 端：下单（待支付） */
export async function POST(request: NextRequest) {
  const guard = await guardVisitor();
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const body = await request.json().catch(() => null);
  const productId = String(body?.productId ?? "");
  const quantityRaw = Number(body?.quantity);
  const quantity =
    Number.isFinite(quantityRaw) && quantityRaw > 0 ? Math.floor(quantityRaw) : 1;

  const product = await prisma.product.findFirst({
    where: { id: productId, status: "PUBLISHED" },
    select: { id: true, merchantId: true, price: true, stock: true },
  });
  if (!product) {
    return NextResponse.json({ ok: false, error: "商品不存在或已下架" }, { status: 404 });
  }
  if (product.stock < quantity) {
    return NextResponse.json({ ok: false, error: "库存不足" }, { status: 400 });
  }

  const verifyCode = await uniqueVerifyCode();
  const order = await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: product.id },
      data: { stock: { decrement: quantity } },
    });
    return tx.order.create({
      data: {
        orderNo: createOrderNo(),
        productId: product.id,
        merchantId: product.merchantId,
        buyerId: userId,
        quantity,
        amount: product.price * quantity,
        verifyCode,
        contact: body?.contact ? String(body.contact).trim() : null,
        remark: body?.remark ? String(body.remark).trim() : null,
      },
      include: orderInclude,
    });
  });

  return NextResponse.json({ ok: true, item: toOrderDto(order) }, { status: 201 });
}
