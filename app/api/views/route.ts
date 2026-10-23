/**
 * @module-note app/api/views/route.ts
 * 浏览记录接口。HTTP请求进入具名方法后执行校验与业务处理，再以响应返回；权限、错误码和数据范围以各分支为准。
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { guardVisitor } from "@/lib/roles";

type ResourceRow = {
  slug: string;
  title: string;
  type: "SCENIC" | "ICH" | "FOOD";
  district: string | null;
  image: string | null;
  summary: string;
  tags: Array<{ tag: { name: string } }>;
};

/**
 * 将资源数据库记录整理为前端返回结构。
 * 输入：resource；类型与可选项见函数签名。
 */
function toResource(resource: ResourceRow) {
  const category =
    resource.type === "SCENIC" ? "景点" : resource.type === "ICH" ? "非遗" : "美食";
  return {
    id: resource.slug,
    name: resource.title,
    category,
    district: resource.district ?? "福州",
    image: resource.image ?? "/images/sanfangqixiang.jpg",
    summary: resource.summary,
    tags: resource.tags.map(({ tag }) => tag.name),
  };
}

/**
 * 读取浏览记录数据，处理对应 GET 请求。
 * 数据库操作：prisma.resourceView.findMany；注意相应的归属过滤与事务边界。
 * 依赖当前会话身份，匿名访问和角色限制由下方分支处理。
 */
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ data: [], loggedIn: false });
  }

  const views = await prisma.resourceView.findMany({
    where: { userId },
    include: { resource: { include: { tags: { include: { tag: true } } } } },
    orderBy: { viewedAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    data: views.map((view) => ({
      ...toResource(view.resource as ResourceRow),
      viewedAt: view.viewedAt.toISOString(),
    })),
    loggedIn: true,
  });
}

/**
 * 提交或创建浏览记录数据，处理对应 POST 请求。
 * 数据库操作：prisma.resource.findUnique、prisma.resourceView.upsert；注意相应的归属过滤与事务边界。
 * 访问前执行游客角色检查，失败直接返回拒绝响应。
 */
export async function POST(request: NextRequest) {
  const guard = await guardVisitor();
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const body = await request.json().catch(() => null);
  const resourceId = String(body?.resourceId ?? "");
  if (!resourceId) {
    return NextResponse.json({ ok: false, error: "缺少 resourceId" }, { status: 400 });
  }

  const resource = await prisma.resource.findUnique({
    where: { slug: resourceId },
    select: { id: true },
  });
  if (!resource) {
    return NextResponse.json({ ok: false, error: "资源不存在" }, { status: 404 });
  }

  await prisma.resourceView.upsert({
    where: { userId_resourceId: { userId, resourceId: resource.id } },
    update: { viewedAt: new Date() },
    create: { userId, resourceId: resource.id },
  });

  return NextResponse.json({ ok: true, recorded: true });
}
