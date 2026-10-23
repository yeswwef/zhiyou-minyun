/**
 * @module-note app/api/classes/route.ts
 * 体验课程接口。HTTP请求进入具名方法后执行校验与业务处理，再以响应返回；权限、错误码和数据范围以各分支为准。
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { experienceClassInclude, toExperienceClassDto } from "@/features/merchant/data";

/** C 端：已上架的非遗体验课列表（含当前用户是否已报名） */
export async function GET() {
  const userId = await getSessionUserId();

  const classes = await prisma.experienceClass.findMany({
    where: { status: "PUBLISHED" },
    include: experienceClassInclude,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  let enrolledIds = new Set<string>();
  if (userId) {
    const mine = await prisma.classEnrollment.findMany({
      where: {
        userId,
        status: { in: ["PENDING", "CONFIRMED", "ATTENDED"] },
        classId: { in: classes.map((item) => item.id) },
      },
      select: { classId: true },
    });
    enrolledIds = new Set(mine.map((item) => item.classId));
  }

  return NextResponse.json({
    ok: true,
    loggedIn: !!userId,
    data: classes.map((item) => ({
      ...toExperienceClassDto(item),
      enrolled: enrolledIds.has(item.id),
    })),
  });
}
