/**
 * @module-note app/api/favorites/route.ts
 * 资源收藏接口。HTTP请求进入具名方法后执行校验与业务处理，再以响应返回；权限、错误码和数据范围以各分支为准。
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { guardVisitor } from "@/lib/roles";
import { communityPostInclude, toCommunityPostDto } from "@/features/community/data";

type ResourceRow = {
  slug: string;
  title: string;
  type: "SCENIC" | "ICH" | "FOOD";
  district: string | null;
  image: string | null;
  summary: string;
  description: string | null;
  history: string | null;
  openTime: string | null;
  address: string | null;
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
    description: resource.description ?? "",
    history: resource.history ?? "",
    openingHours: resource.openTime ?? "以现场公告为准",
    address: resource.address ?? "福州市",
    tags: resource.tags.map(({ tag }) => tag.name),
  };
}

/**
 * 读取资源收藏数据，处理对应 GET 请求。
 * 数据库操作：prisma.resource.findUnique、prisma.favorite.findUnique、prisma.favorite.findMany、prisma.communityPostFavorite.findMany；注意相应的归属过滤与事务边界。
 * 依赖当前会话身份，匿名访问和角色限制由下方分支处理。
 */
export async function GET(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ data: [], loggedIn: false, saved: false });
  }

  const resourceId = request.nextUrl.searchParams.get("resourceId");
  if (resourceId) {
    const resource = await prisma.resource.findUnique({
      where: { slug: resourceId },
      select: { id: true },
    });
    if (!resource) {
      return NextResponse.json({ saved: false, loggedIn: true });
    }
    const favorite = await prisma.favorite.findUnique({
      where: { userId_resourceId: { userId, resourceId: resource.id } },
    });
    return NextResponse.json({ saved: !!favorite, loggedIn: true });
  }

  const [favorites, communityFavorites] = await Promise.all([
    prisma.favorite.findMany({
      where: { userId },
      include: { resource: { include: { tags: { include: { tag: true } } } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.communityPostFavorite.findMany({
      where: { userId, post: { status: "PUBLISHED" } },
      include: { post: { include: communityPostInclude } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    data: favorites.map((item) => toResource(item.resource as ResourceRow)),
    community: communityFavorites.map((item) => toCommunityPostDto(item.post)),
    loggedIn: true,
  });
}

/**
 * 提交或创建资源收藏数据，处理对应 POST 请求。
 * 数据库操作：prisma.resource.findUnique、prisma.favorite.findUnique、prisma.favorite.delete、prisma.favorite.create；注意相应的归属过滤与事务边界。
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

  const existing = await prisma.favorite.findUnique({
    where: { userId_resourceId: { userId, resourceId: resource.id } },
  });

  let saved: boolean;
  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    saved = false;
  } else {
    await prisma.favorite.create({ data: { userId, resourceId: resource.id } });
    saved = true;
  }

  return NextResponse.json({ ok: true, saved });
}

/** 将升级前保存在 localStorage 的收藏一次性导入当前账号。 */
export async function PUT(request: NextRequest) {
  const guard = await guardVisitor();
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const body = await request.json().catch(() => null);
  const resourceIds: string[] = Array.isArray(body?.resourceIds)
    ? [...new Set<string>(body.resourceIds.filter((id: unknown): id is string => typeof id === "string"))]
    : [];

  if (!resourceIds.length) {
    return NextResponse.json({ ok: true, imported: 0 });
  }

  const resources = await prisma.resource.findMany({
    where: { slug: { in: resourceIds } },
    select: { id: true },
  });

  const result = await prisma.favorite.createMany({
    data: resources.map((resource) => ({ userId, resourceId: resource.id })),
    skipDuplicates: true,
  });

  return NextResponse.json({ ok: true, imported: result.count });
}
