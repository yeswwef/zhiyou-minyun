/**
 * @module-note app/api/merchant/enrollments/route.ts
 * 商户业务／报名记录接口。HTTP请求进入具名方法后执行校验与业务处理，再以响应返回；权限、错误码和数据范围以各分支为准。
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { enrollmentInclude, toEnrollmentDto } from "@/features/merchant/data";

const STATUSES = ["PENDING", "CONFIRMED", "CANCELLED", "ATTENDED"] as const;

/**
 * 读取商户业务／报名记录数据，处理对应 GET 请求。
 * 数据库操作：prisma.classEnrollment.findMany；注意相应的归属过滤与事务边界。
 * 依赖当前会话身份，匿名访问和角色限制由下方分支处理。
 */
export async function GET(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "请先登录" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const classId = params.get("classId");
  const status = params.get("status");

  const enrollments = await prisma.classEnrollment.findMany({
    where: {
      class: { is: { merchantId: userId } },
      ...(classId ? { classId } : {}),
      ...(status && STATUSES.includes(status as (typeof STATUSES)[number])
        ? { status: status as (typeof STATUSES)[number] }
        : {}),
    },
    include: enrollmentInclude,
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return NextResponse.json({ ok: true, data: enrollments.map(toEnrollmentDto) });
}
