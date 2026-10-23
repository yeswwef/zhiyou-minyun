/**
 * @module-note app/api/merchant/orders/route.ts
 * 商户业务／商品订单接口。HTTP请求进入具名方法后执行校验与业务处理，再以响应返回；权限、错误码和数据范围以各分支为准。
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { orderInclude, toMerchantOrderDto } from "@/features/merchant/data";

const STATUSES = ["PENDING", "PAID", "VERIFIED", "CANCELLED"] as const;

/**
 * 读取商户业务／商品订单数据，处理对应 GET 请求。
 * 数据库操作：prisma.order.findMany；注意相应的归属过滤与事务边界。
 * 依赖当前会话身份，匿名访问和角色限制由下方分支处理。
 */
export async function GET(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "请先登录" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const status = params.get("status");
  const keyword = params.get("q")?.trim();

  const orders = await prisma.order.findMany({
    where: {
      merchantId: userId,
      ...(status && STATUSES.includes(status as (typeof STATUSES)[number])
        ? { status: status as (typeof STATUSES)[number] }
        : {}),
      ...(keyword
        ? {
            OR: [
              { orderNo: { contains: keyword } },
              { product: { is: { title: { contains: keyword } } } },
            ],
          }
        : {}),
    },
    include: orderInclude,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ ok: true, data: orders.map(toMerchantOrderDto) });
}
