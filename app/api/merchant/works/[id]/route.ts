/**
 * @module-note app/api/merchant/works/[id]/route.ts
 * 商户业务／非遗作品／指定id接口。HTTP请求进入具名方法后执行校验与业务处理，再以响应返回；权限、错误码和数据范围以各分支为准。
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { studioWorkInclude, toStudioWorkDto } from "@/features/merchant/data";

/**
 * 局部更新商户业务／非遗作品／指定id数据，处理对应 PATCH 请求。
 * 数据库操作：prisma.studioWork.findFirst、prisma.studioWork.update；注意相应的归属过滤与事务边界。
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
  const existing = await prisma.studioWork.findFirst({
    where: { id, merchantId: userId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "作品不存在" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const data: Record<string, unknown> = {};
  if (typeof body?.title === "string" && body.title.trim()) data.title = body.title.trim();
  if (typeof body?.description === "string" && body.description.trim()) {
    data.description = body.description.trim();
  }
  if (body?.image !== undefined) data.image = body.image ? String(body.image).trim() : null;
  if (body?.sortOrder !== undefined) {
    const num = Number(body.sortOrder);
    if (Number.isFinite(num)) data.sortOrder = Math.floor(num);
  }

  const work = await prisma.studioWork.update({
    where: { id },
    data,
    include: studioWorkInclude,
  });

  return NextResponse.json({ ok: true, item: toStudioWorkDto(work) });
}

/**
 * 删除或取消商户业务／非遗作品／指定id数据，处理对应 DELETE 请求。
 * 数据库操作：prisma.studioWork.findFirst、prisma.studioWork.delete；注意相应的归属过滤与事务边界。
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
  const existing = await prisma.studioWork.findFirst({
    where: { id, merchantId: userId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "作品不存在" }, { status: 404 });
  }

  await prisma.studioWork.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
