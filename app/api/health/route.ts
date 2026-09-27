import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * 健康检查（空壳版）
 * 作用：确认「Next.js 服务 + MySQL 连接」这条最基础的链路是通的。
 * 后续接向量库 / 模型时，再往这里加 qdrant / model 两段。
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const [users, resources, tags] = await Promise.all([
      prisma.user.count(),
      prisma.resource.count(),
      prisma.tag.count(),
    ]);

    return NextResponse.json({
      ok: true,
      service: "zhiyou-minyun",
      db: "up",
      counts: { users, resources, tags },
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        service: "zhiyou-minyun",
        db: "down",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
