/**
 * @module-note app/api/merchant/products/route.ts
 * 商户业务／商品接口。HTTP请求进入具名方法后执行校验与业务处理，再以响应返回；权限、错误码和数据范围以各分支为准。
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { productInclude, toProductDto } from "@/features/merchant/data";
import { PRODUCT_CATEGORIES, type ProductCategoryValue } from "@/features/merchant/types";

const CATEGORY_VALUES = PRODUCT_CATEGORIES.map((item) => item.value);

/**
 * 校验以元输入的价格并转换为整数分，无效输入返回 null。
 * 输入：value；类型与可选项见函数签名。
 */
function parsePriceYuan(value: unknown): number | null {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.round(num * 100);
}

/**
 * 读取商户业务／商品数据，处理对应 GET 请求。
 * 数据库操作：prisma.product.findMany；注意相应的归属过滤与事务边界。
 * 依赖当前会话身份，匿名访问和角色限制由下方分支处理。
 */
export async function GET(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "请先登录" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const status = params.get("status");
  const category = params.get("category");

  const products = await prisma.product.findMany({
    where: {
      merchantId: userId,
      ...(status === "DRAFT" || status === "PUBLISHED" ? { status } : {}),
      ...(category && CATEGORY_VALUES.includes(category as ProductCategoryValue)
        ? { category: category as ProductCategoryValue }
        : {}),
    },
    include: productInclude,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ok: true, data: products.map(toProductDto) });
}

/**
 * 提交或创建商户业务／商品数据，处理对应 POST 请求。
 * 数据库操作：prisma.product.create；注意相应的归属过滤与事务边界。
 * 依赖当前会话身份，匿名访问和角色限制由下方分支处理。
 */
export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "请先登录" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const title = String(body?.title ?? "").trim();
  const category = String(body?.category ?? "");
  const summary = String(body?.summary ?? "").trim();
  const price = parsePriceYuan(body?.price);

  if (!title) {
    return NextResponse.json({ ok: false, error: "请填写商品名称" }, { status: 400 });
  }
  if (!CATEGORY_VALUES.includes(category as ProductCategoryValue)) {
    return NextResponse.json({ ok: false, error: "请选择商品类别" }, { status: 400 });
  }
  if (!summary) {
    return NextResponse.json({ ok: false, error: "请填写一句话简介" }, { status: 400 });
  }
  if (price === null) {
    return NextResponse.json({ ok: false, error: "价格必须是不小于 0 的数字" }, { status: 400 });
  }

  const stockRaw = Number(body?.stock);
  const stock = Number.isFinite(stockRaw) && stockRaw >= 0 ? Math.floor(stockRaw) : 0;

  const product = await prisma.product.create({
    data: {
      merchantId: userId,
      category: category as ProductCategoryValue,
      title,
      summary,
      description: body?.description ? String(body.description) : null,
      price,
      stock,
      unit: body?.unit ? String(body.unit).trim() : null,
      image: body?.image ? String(body.image).trim() : null,
      location: body?.location ? String(body.location).trim() : null,
      status: body?.status === "DRAFT" ? "DRAFT" : "PUBLISHED",
    },
    include: productInclude,
  });

  return NextResponse.json({ ok: true, item: toProductDto(product) }, { status: 201 });
}
