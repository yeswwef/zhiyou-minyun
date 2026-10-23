/**
 * @module-note app/api/shop/products/[id]/route.ts
 * 商城／商品／指定id接口。HTTP请求进入具名方法后执行校验与业务处理，再以响应返回；权限、错误码和数据范围以各分支为准。
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { productInclude, toProductDto } from "@/features/merchant/data";

/** C 端：商品详情 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const product = await prisma.product.findFirst({
    where: { id, status: "PUBLISHED" },
    include: productInclude,
  });

  if (!product) {
    return NextResponse.json({ ok: false, error: "商品不存在或已下架" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, item: toProductDto(product) });
}
