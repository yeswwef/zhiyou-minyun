import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const typeMap = {
  景点: "SCENIC",
  非遗: "ICH",
  美食: "FOOD",
} as const;

function toResource(resource: {
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
}) {
  const category = resource.type === "SCENIC" ? "景点" : resource.type === "ICH" ? "非遗" : "美食";
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
  const params = request.nextUrl.searchParams;
  const keyword = params.get("q")?.trim();
  const category = params.get("category") ?? params.get("type");
  const tag = params.get("tag");
  const recommended = params.get("recommended") === "true";
  const requestedPage = Math.max(Number(params.get("page") ?? 1) || 1, 1);
  const pageSize = Math.min(
    Math.max(Number(params.get("pageSize") ?? params.get("limit") ?? 50) || 50, 1),
    100,
  );
  const type = (category && typeMap[category as keyof typeof typeMap]
    ? typeMap[category as keyof typeof typeMap]
    : category && ["SCENIC", "ICH", "FOOD"].includes(category)
      ? category
      : undefined) as "SCENIC" | "ICH" | "FOOD" | undefined;
  const where = {
    ...(type ? { type } : {}),
    ...(keyword
      ? {
          OR: [
            { title: { contains: keyword } },
            { summary: { contains: keyword } },
            { district: { contains: keyword } },
          ],
        }
      : {}),
    ...(tag ? { tags: { some: { tag: { name: tag } } } } : {}),
  };
  const include = { tags: { include: { tag: true } } } as const;
  const orderBy = recommended
    ? [{ recommendationWeight: "desc" as const }, { updatedAt: "desc" as const }]
    : [{ updatedAt: "desc" as const }, { title: "asc" as const }];

  const [resources, tags, total] = await Promise.all([
    prisma.resource.findMany({
      where,
      include,
      orderBy,
      skip: recommended ? 0 : (requestedPage - 1) * pageSize,
      take: recommended ? 100 : pageSize,
    }).then((items) => {
      if (!recommended) return items;

      const selected = [];
      const selectedIds = new Set<string>();
      for (const resourceType of ["SCENIC", "ICH", "FOOD"] as const) {
        const item = items.find(
          (candidate) => candidate.type === resourceType,
        );
        if (item) {
          selected.push(item);
          selectedIds.add(item.id);
        }
      }
      for (const item of items) {
        if (selected.length >= pageSize) break;
        if (!selectedIds.has(item.id)) selected.push(item);
      }
      return selected.slice(0, pageSize);
    }),
    prisma.tag.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
    prisma.resource.count({ where }),
  ]);

  return NextResponse.json({
    data: resources.map((resource) =>
      toResource(resource as Parameters<typeof toResource>[0]),
    ),
    availableTags: tags.map((item) => item.name),
    pagination: {
      page: recommended ? 1 : requestedPage,
      pageSize,
      total,
      totalPages: Math.max(Math.ceil(total / pageSize), 1),
    },
  });
}
