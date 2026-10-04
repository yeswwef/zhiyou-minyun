import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  CommunityImageError,
  saveCommunityImages,
  deleteCommunityImages,
  validateCommunityImages,
} from "@/lib/storage/community";
import { communityPostInclude, toCommunityPostDto } from "@/features/community/data";
import {
  CommunityValidationError,
  getImageFiles,
  parseCommunityPostForm,
} from "@/features/community/validation";
import { buildCommunitySearchWhere } from "@/features/community/search";

const RESOURCE_TYPES = new Set(["SCENIC", "ICH", "FOOD"]);
const POST_TYPES = new Set(["CHECKIN", "REVIEW"]);

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const page = Math.max(Number(params.get("page") ?? 1) || 1, 1);
  const pageSize = Math.min(Math.max(Number(params.get("pageSize") ?? 10) || 10, 1), 30);
  const type = params.get("type");
  const category = params.get("category");
  const resourceId = params.get("resourceId")?.trim();
  const mine = params.get("mine") === "true";
  const sort = params.get("sort") === "latest" ? "latest" : "recommended";
  const query = params.get("q")?.trim() ?? "";
  const userId = mine ? await getSessionUserId() : null;

  if (mine && !userId) {
    return NextResponse.json({ ok: false, error: "请先登录" }, { status: 401 });
  }

  const searchWhere = await buildCommunitySearchWhere(query);
  const where: Prisma.CommunityPostWhereInput = {
    status: "PUBLISHED",
    ...(userId ? { userId } : {}),
    ...(type && POST_TYPES.has(type) ? { type: type as "CHECKIN" | "REVIEW" } : {}),
    ...(category && RESOURCE_TYPES.has(category)
      ? { resource: { is: { type: category as "SCENIC" | "ICH" | "FOOD" } } }
      : {}),
    ...(resourceId
      ? { resource: { is: { OR: [{ slug: resourceId }, { id: resourceId }] } } }
      : {}),
    ...(searchWhere ?? {}),
  };

  const orderBy: Prisma.CommunityPostOrderByWithRelationInput[] =
    sort === "latest"
      ? [{ createdAt: "desc" }]
      : [{ recommendationWeight: "desc" }, { createdAt: "desc" }];

  const [posts, total] = await Promise.all([
    prisma.communityPost.findMany({
      where,
      include: communityPostInclude,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.communityPost.count({ where }),
  ]);

  return NextResponse.json({
    ok: true,
    data: posts.map(toCommunityPostDto),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(Math.ceil(total / pageSize), 1),
    },
  });
}

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "请先登录" }, { status: 401 });
  }

  let savedImages: string[] = [];
  try {
    const formData = await request.formData();
    const input = parseCommunityPostForm(formData);
    const files = getImageFiles(formData);
    validateCommunityImages(files);

    const resource = await prisma.resource.findFirst({
      where: { OR: [{ slug: input.resourceId }, { id: input.resourceId }] },
      select: { id: true },
    });
    if (!resource) {
      return NextResponse.json({ ok: false, error: "关联的文旅资源不存在" }, { status: 404 });
    }

    if (input.type === "REVIEW") {
      const existing = await prisma.communityPost.findFirst({
        where: {
          userId,
          resourceId: resource.id,
          type: "REVIEW",
          status: "PUBLISHED",
        },
        select: { id: true },
      });
      if (existing) {
        return NextResponse.json(
          { ok: false, error: "你已经评价过该资源，请修改原评价", existingId: existing.id },
          { status: 409 },
        );
      }
    }

    if (input.type === "CHECKIN") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      const existingToday = await prisma.communityPost.findFirst({
        where: {
          userId,
          resourceId: resource.id,
          type: "CHECKIN",
          status: "PUBLISHED",
          createdAt: { gte: start, lt: end },
        },
        select: { id: true },
      });
      if (existingToday) {
        return NextResponse.json(
          { ok: false, error: "同一地点每天最多打卡一次", existingId: existingToday.id },
          { status: 409 },
        );
      }
    }

    savedImages = await saveCommunityImages(files);
    const post = await prisma.$transaction((tx) =>
      tx.communityPost.create({
        data: {
          userId,
          resourceId: resource.id,
          type: input.type,
          title: input.title,
          content: input.content,
          rating: input.rating,
          visitedAt: input.visitedAt,
          images: {
            create: savedImages.map((imageUrl, sortOrder) => ({ imageUrl, sortOrder })),
          },
        },
        include: communityPostInclude,
      }),
    );

    revalidatePath("/community");
    revalidatePath("/community/mine");
    return NextResponse.json({ ok: true, data: toCommunityPostDto(post) }, { status: 201 });
  } catch (error) {
    if (savedImages.length) await deleteCommunityImages(savedImages);
    if (error instanceof CommunityValidationError || error instanceof CommunityImageError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    console.error("创建社区内容失败", error);
    return NextResponse.json({ ok: false, error: "发布失败，请稍后重试" }, { status: 500 });
  }
}
