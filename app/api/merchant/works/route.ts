/**
 * @module-note app/api/merchant/works/route.ts
 * 商户业务／非遗作品接口。HTTP请求进入具名方法后执行校验与业务处理，再以响应返回；权限、错误码和数据范围以各分支为准。
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { studioWorkInclude, toStudioWorkDto } from "@/features/merchant/data";

/**
 * 读取商户业务／非遗作品数据，处理对应 GET 请求。
 * 数据库操作：prisma.studioWork.findMany；注意相应的归属过滤与事务边界。
 * 依赖当前会话身份，匿名访问和角色限制由下方分支处理。
 */
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "请先登录" }, { status: 401 });
  }

  const works = await prisma.studioWork.findMany({
    where: { merchantId: userId },
    include: studioWorkInclude,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ ok: true, data: works.map(toStudioWorkDto) });
}

/**
 * 提交或创建商户业务／非遗作品数据，处理对应 POST 请求。
 * 数据库操作：prisma.studioWork.create；注意相应的归属过滤与事务边界。
 * 依赖当前会话身份，匿名访问和角色限制由下方分支处理。
 */
export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "请先登录" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const title = String(body?.title ?? "").trim();
  const description = String(body?.description ?? "").trim();
  if (!title) {
    return NextResponse.json({ ok: false, error: "请填写作品名称" }, { status: 400 });
  }
  if (!description) {
    return NextResponse.json({ ok: false, error: "请填写作品介绍" }, { status: 400 });
  }

  const sortRaw = Number(body?.sortOrder);
  const work = await prisma.studioWork.create({
    data: {
      merchantId: userId,
      title,
      description,
      image: body?.image ? String(body.image).trim() : null,
      sortOrder: Number.isFinite(sortRaw) ? Math.floor(sortRaw) : 0,
    },
    include: studioWorkInclude,
  });

  return NextResponse.json({ ok: true, item: toStudioWorkDto(work) }, { status: 201 });
}
