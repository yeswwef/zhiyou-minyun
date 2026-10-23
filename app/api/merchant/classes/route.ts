/**
 * @module-note app/api/merchant/classes/route.ts
 * 商户业务／体验课程接口。HTTP请求进入具名方法后执行校验与业务处理，再以响应返回；权限、错误码和数据范围以各分支为准。
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { experienceClassInclude, toExperienceClassDto } from "@/features/merchant/data";

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
 * 读取商户业务／体验课程数据，处理对应 GET 请求。
 * 数据库操作：prisma.experienceClass.findMany；注意相应的归属过滤与事务边界。
 * 依赖当前会话身份，匿名访问和角色限制由下方分支处理。
 */
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "请先登录" }, { status: 401 });
  }

  const classes = await prisma.experienceClass.findMany({
    where: { merchantId: userId },
    include: experienceClassInclude,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ok: true, data: classes.map(toExperienceClassDto) });
}

/**
 * 提交或创建商户业务／体验课程数据，处理对应 POST 请求。
 * 数据库操作：prisma.experienceClass.create；注意相应的归属过滤与事务边界。
 * 依赖当前会话身份，匿名访问和角色限制由下方分支处理。
 */
export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "请先登录" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const title = String(body?.title ?? "").trim();
  const summary = String(body?.summary ?? "").trim();
  const schedule = String(body?.schedule ?? "").trim();
  const price = parsePriceYuan(body?.price ?? 0);

  if (!title) {
    return NextResponse.json({ ok: false, error: "请填写课程名称" }, { status: 400 });
  }
  if (!summary) {
    return NextResponse.json({ ok: false, error: "请填写课程简介" }, { status: 400 });
  }
  if (!schedule) {
    return NextResponse.json({ ok: false, error: "请填写上课时间" }, { status: 400 });
  }
  if (price === null) {
    return NextResponse.json({ ok: false, error: "价格不合法" }, { status: 400 });
  }

  const capacityRaw = Number(body?.capacity);
  const capacity =
    Number.isFinite(capacityRaw) && capacityRaw > 0 ? Math.floor(capacityRaw) : 20;

  const item = await prisma.experienceClass.create({
    data: {
      merchantId: userId,
      title,
      summary,
      schedule,
      price,
      capacity,
      location: body?.location ? String(body.location).trim() : null,
      image: body?.image ? String(body.image).trim() : null,
      status: body?.status === "DRAFT" ? "DRAFT" : "PUBLISHED",
    },
    include: experienceClassInclude,
  });

  return NextResponse.json({ ok: true, item: toExperienceClassDto(item) }, { status: 201 });
}
