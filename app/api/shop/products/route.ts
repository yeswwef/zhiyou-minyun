/**
 * @module-note app/api/shop/products/route.ts
 * 商城／商品接口。HTTP请求进入具名方法后执行校验与业务处理，再以响应返回；权限、错误码和数据范围以各分支为准。
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { productInclude, toProductDto } from "@/features/merchant/data";
import { PRODUCT_CATEGORIES, type ProductCategoryValue } from "@/features/merchant/types";

const CATEGORY_VALUES = PRODUCT_CATEGORIES.map((item) => item.value);

/** C 端：已上架商品列表（游客可浏览） */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const category = params.get("category");
  const keyword = params.get("q")?.trim();
  const merchantId = params.get("merchantId");

  const products = await prisma.product.findMany({
    where: {
      status: "PUBLISHED",
      ...(category && CATEGORY_VALUES.includes(category as ProductCategoryValue)
        ? { category: category as ProductCategoryValue }
        : {}),
      ...(merchantId ? { merchantId } : {}),
      ...(keyword
        ? {
            OR: [
              { title: { contains: keyword } },
              { summary: { contains: keyword } },
              { location: { contains: keyword } },
            ],
          }
        : {}),
    },
    include: productInclude,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ ok: true, data: products.map(toProductDto) });
}
