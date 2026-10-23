/**
 * @module-note app/api/merchant/classes/[id]/route.ts
 * 商户业务／体验课程／指定id接口。HTTP请求进入具名方法后执行校验与业务处理，再以响应返回；权限、错误码和数据范围以各分支为准。
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { experienceClassInclude, toExperienceClassDto } from "@/features/merchant/data";

/**
 * 局部更新商户业务／体验课程／指定id数据，处理对应 PATCH 请求。
 * 数据库操作：prisma.experienceClass.findFirst、prisma.experienceClass.update；注意相应的归属过滤与事务边界。
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
  const existing = await prisma.experienceClass.findFirst({
    where: { id, merchantId: userId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "课程不存在" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const data: Record<string, unknown> = {};
  if (typeof body?.title === "string" && body.title.trim()) data.title = body.title.trim();
  if (typeof body?.summary === "string") data.summary = body.summary.trim();
  if (typeof body?.schedule === "string" && body.schedule.trim()) {
    data.schedule = body.schedule.trim();
  }
  if (body?.price !== undefined) {
    const num = Number(body.price);
    if (!Number.isFinite(num) || num < 0) {
      return NextResponse.json({ ok: false, error: "价格不合法" }, { status: 400 });
    }
    data.price = Math.round(num * 100);
  }
  if (body?.capacity !== undefined) {
    const num = Number(body.capacity);
    data.capacity = Number.isFinite(num) && num > 0 ? Math.floor(num) : 20;
  }
  if (body?.location !== undefined) {
    data.location = body.location ? String(body.location).trim() : null;
  }
  if (body?.image !== undefined) data.image = body.image ? String(body.image).trim() : null;
  if (body?.status !== undefined) {
    if (body.status !== "DRAFT" && body.status !== "PUBLISHED") {
      return NextResponse.json({ ok: false, error: "状态不合法" }, { status: 400 });
    }
    data.status = body.status;
  }

  const item = await prisma.experienceClass.update({
    where: { id },
    data,
    include: experienceClassInclude,
  });

  return NextResponse.json({ ok: true, item: toExperienceClassDto(item) });
}

/**
 * 删除或取消商户业务／体验课程／指定id数据，处理对应 DELETE 请求。
 * 数据库操作：prisma.experienceClass.findFirst、prisma.experienceClass.delete；注意相应的归属过滤与事务边界。
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
  const existing = await prisma.experienceClass.findFirst({
    where: { id, merchantId: userId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "课程不存在" }, { status: 404 });
  }

  await prisma.experienceClass.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
