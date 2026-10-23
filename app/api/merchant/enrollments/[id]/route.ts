/**
 * @module-note app/api/merchant/enrollments/[id]/route.ts
 * 商户业务／报名记录／指定id接口。HTTP请求进入具名方法后执行校验与业务处理，再以响应返回；权限、错误码和数据范围以各分支为准。
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { enrollmentInclude, toEnrollmentDto } from "@/features/merchant/data";

const ALLOWED = ["CONFIRMED", "CANCELLED", "ATTENDED"] as const;

/** 商户管理报名：确认 / 取消 / 标记已参加 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "请先登录" }, { status: 401 });
  }

  const { id } = await params;
  const enrollment = await prisma.classEnrollment.findFirst({
    where: { id, class: { is: { merchantId: userId } } },
    select: { id: true },
  });
  if (!enrollment) {
    return NextResponse.json({ ok: false, error: "报名记录不存在" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const status = String(body?.status ?? "");
  if (!ALLOWED.includes(status as (typeof ALLOWED)[number])) {
    return NextResponse.json({ ok: false, error: "状态不合法" }, { status: 400 });
  }

  const updated = await prisma.classEnrollment.update({
    where: { id },
    data: { status: status as (typeof ALLOWED)[number] },
    include: enrollmentInclude,
  });

  return NextResponse.json({ ok: true, item: toEnrollmentDto(updated) });
}
