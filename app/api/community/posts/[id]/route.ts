import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  COMMUNITY_MAX_IMAGES,
  CommunityImageError,
  deleteCommunityImages,
  saveCommunityImages,
  validateCommunityImages,
} from "@/lib/storage/community";
import { communityPostInclude, toCommunityPostDto } from "@/features/community/data";
import {
  CommunityValidationError,
  getImageFiles,
  parseCommunityPostForm,
} from "@/features/community/validation";

type ImageOrderItem =
  | { kind: "existing"; value: string }
  | { kind: "new"; index: number };

function parseImageOrder(formData: FormData): ImageOrderItem[] | null {
  const raw = formData.get("imageOrder");
  if (typeof raw !== "string" || !raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((item): item is ImageOrderItem => {
      if (!item || typeof item !== "object") return false;
      const candidate = item as Partial<ImageOrderItem> & { kind?: unknown };
      return (
        (candidate.kind === "existing" && typeof candidate.value === "string") ||
        (candidate.kind === "new" && Number.isInteger(candidate.index))
      );
    });
  } catch {
    throw new CommunityValidationError("图片排序信息不正确");
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const post = await prisma.communityPost.findFirst({
    where: { id, status: "PUBLISHED" },
    include: communityPostInclude,
  });
  if (!post) {
    return NextResponse.json({ ok: false, error: "内容不存在" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, data: toCommunityPostDto(post) });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "请先登录" }, { status: 401 });
  }
  const { id } = await params;
  const current = await prisma.communityPost.findUnique({
    where: { id },
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });
  if (!current) {
    return NextResponse.json({ ok: false, error: "内容不存在" }, { status: 404 });
  }
  if (current.userId !== userId) {
    return NextResponse.json({ ok: false, error: "只能修改自己的内容" }, { status: 403 });
  }

  let newImageUrls: string[] = [];
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
      const duplicate = await prisma.communityPost.findFirst({
        where: {
          id: { not: id },
          userId,
          resourceId: resource.id,
          type: "REVIEW",
          status: "PUBLISHED",
        },
        select: { id: true },
      });
      if (duplicate) {
        return NextResponse.json(
          { ok: false, error: "你已经评价过该资源", existingId: duplicate.id },
          { status: 409 },
        );
      }
    }

    const currentUrls = new Set(current.images.map((image) => image.imageUrl));
    const keptUrls = formData
      .getAll("existingImages")
      .filter((entry): entry is string => typeof entry === "string" && currentUrls.has(entry));
    if (keptUrls.length + files.length > COMMUNITY_MAX_IMAGES) {
      throw new CommunityImageError(`最多保留或上传 ${COMMUNITY_MAX_IMAGES} 张图片`);
    }

    newImageUrls = await saveCommunityImages(files);
    const requestedOrder = parseImageOrder(formData);
    const orderedUrls = requestedOrder
      ? requestedOrder.flatMap((item) => {
          if (item.kind === "existing") {
            return keptUrls.includes(item.value) ? [item.value] : [];
          }
          return newImageUrls[item.index] ? [newImageUrls[item.index]] : [];
        })
      : [...keptUrls, ...newImageUrls];
    const finalUrls = [...new Set(orderedUrls)].slice(0, COMMUNITY_MAX_IMAGES);

    const post = await prisma.$transaction((tx) =>
      tx.communityPost.update({
        where: { id },
        data: {
          resourceId: resource.id,
          type: input.type,
          title: input.title,
          content: input.content,
          rating: input.rating,
          visitedAt: input.visitedAt,
          images: {
            deleteMany: {},
            create: finalUrls.map((imageUrl, sortOrder) => ({ imageUrl, sortOrder })),
          },
        },
        include: communityPostInclude,
      }),
    );

    const removedUrls = current.images
      .map((image) => image.imageUrl)
      .filter((url) => !finalUrls.includes(url));
    await deleteCommunityImages(removedUrls);
    revalidatePath("/community");
    revalidatePath(`/community/${id}`);
    revalidatePath("/community/mine");
    return NextResponse.json({ ok: true, data: toCommunityPostDto(post) });
  } catch (error) {
    if (newImageUrls.length) await deleteCommunityImages(newImageUrls);
    if (error instanceof CommunityValidationError || error instanceof CommunityImageError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    console.error("更新社区内容失败", error);
    return NextResponse.json({ ok: false, error: "保存失败，请稍后重试" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "请先登录" }, { status: 401 });
  }
  const { id } = await params;
  const current = await prisma.communityPost.findUnique({
    where: { id },
    include: { images: true },
  });
  if (!current) {
    return NextResponse.json({ ok: false, error: "内容不存在" }, { status: 404 });
  }
  if (current.userId !== userId) {
    return NextResponse.json({ ok: false, error: "只能删除自己的内容" }, { status: 403 });
  }

  await prisma.$transaction((tx) => tx.communityPost.delete({ where: { id } }));
  await deleteCommunityImages(current.images.map((image) => image.imageUrl));
  revalidatePath("/community");
  revalidatePath("/community/mine");
  return NextResponse.json({ ok: true });
}
