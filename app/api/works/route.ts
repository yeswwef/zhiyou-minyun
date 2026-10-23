/**
 * @module-note app/api/works/route.ts
 * 非遗作品接口。HTTP请求进入具名方法后执行校验与业务处理，再以响应返回；权限、错误码和数据范围以各分支为准。
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** C 端：非遗工作室作品展厅（全部作品） */
export async function GET() {
  const works = await prisma.studioWork.findMany({
    include: {
      merchant: {
        select: { id: true, username: true, nickname: true, merchantName: true },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  return NextResponse.json({
    ok: true,
    data: works.map((work) => ({
      id: work.id,
      title: work.title,
      description: work.description,
      image: work.image,
      sortOrder: work.sortOrder,
      createdAt: work.createdAt.toISOString(),
      merchant: work.merchant,
    })),
  });
}
