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
    tags: resource.tags.map(({ tag }) => tag.name),
  };
}

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

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: true, recorded: false });
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

  await prisma.resourceView.upsert({
    where: { userId_resourceId: { userId, resourceId: resource.id } },
    update: { viewedAt: new Date() },
    create: { userId, resourceId: resource.id },
  });

  return NextResponse.json({ ok: true, recorded: true });
}
