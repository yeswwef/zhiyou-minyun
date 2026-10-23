/**
 * @module-note app/api/merchant/products/[id]/route.ts
 * 商户业务／商品／指定id接口。HTTP请求进入具名方法后执行校验与业务处理，再以响应返回；权限、错误码和数据范围以各分支为准。
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { productInclude, toProductDto } from "@/features/merchant/data";
import { PRODUCT_CATEGORIES, type ProductCategoryValue } from "@/features/merchant/types";

const CATEGORY_VALUES = PRODUCT_CATEGORIES.map((item) => item.value);

/**
 * 局部更新商户业务／商品／指定id数据，处理对应 PATCH 请求。
 * 数据库操作：prisma.product.findFirst、prisma.product.update；注意相应的归属过滤与事务边界。
 * 依赖当前会话身份，匿名访问和角色限制由下方分支处理。
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
  const existing = await prisma.product.findFirst({
    where: { id, merchantId: userId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "商品不存在" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const data: Record<string, unknown> = {};

  if (typeof body?.title === "string" && body.title.trim()) data.title = body.title.trim();
  if (typeof body?.summary === "string") data.summary = body.summary.trim();
  if (body?.description !== undefined) {
    data.description = body.description ? String(body.description) : null;
  }
  if (body?.category !== undefined) {
    if (!CATEGORY_VALUES.includes(body.category)) {
      return NextResponse.json({ ok: false, error: "商品类别不合法" }, { status: 400 });
    }
    data.category = body.category as ProductCategoryValue;
  }
  if (body?.price !== undefined) {
    const num = Number(body.price);
    if (!Number.isFinite(num) || num < 0) {
      return NextResponse.json({ ok: false, error: "价格不合法" }, { status: 400 });
    }
    data.price = Math.round(num * 100);
  }
  if (body?.stock !== undefined) {
    const num = Number(body.stock);
    data.stock = Number.isFinite(num) && num >= 0 ? Math.floor(num) : 0;
  }
  if (body?.unit !== undefined) data.unit = body.unit ? String(body.unit).trim() : null;
  if (body?.image !== undefined) data.image = body.image ? String(body.image).trim() : null;
  if (body?.location !== undefined) {
    data.location = body.location ? String(body.location).trim() : null;
  }
  if (body?.status !== undefined) {
    if (body.status !== "DRAFT" && body.status !== "PUBLISHED") {
      return NextResponse.json({ ok: false, error: "状态不合法" }, { status: 400 });
    }
    data.status = body.status;
  }

  const product = await prisma.product.update({
    where: { id },
    data,
    include: productInclude,
  });

  return NextResponse.json({ ok: true, item: toProductDto(product) });
}

/**
 * 删除或取消商户业务／商品／指定id数据，处理对应 DELETE 请求。
 * 数据库操作：prisma.product.findFirst、prisma.product.delete；注意相应的归属过滤与事务边界。
 * 依赖当前会话身份，匿名访问和角色限制由下方分支处理。
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "请先登录" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.product.findFirst({
    where: { id, merchantId: userId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "商品不存在" }, { status: 404 });
  }

  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
