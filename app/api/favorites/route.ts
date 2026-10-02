import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

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

  const favorites = await prisma.favorite.findMany({
    where: { userId },
    include: { resource: { include: { tags: { include: { tag: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    data: favorites.map((item) => toResource(item.resource as ResourceRow)),
    loggedIn: true,
  });
}

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "请先登录" }, { status: 401 });
  }

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
