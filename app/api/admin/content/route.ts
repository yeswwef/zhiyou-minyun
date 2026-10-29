/**
 * @module-note app/api/admin/content/route.ts
 * 平台管理中心：文旅资源与社区内容治理接口。
 */
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { guardAdmin } from "@/lib/roles";

/** 查询社区帖子与文旅资源，供内容治理页统一展示。 */
export async function GET(req: NextRequest) {
  const guard = await guardAdmin();
  if (!guard.ok) return guard.response;

  const keyword = (req.nextUrl.searchParams.get("q") || "").trim().slice(0, 40);
  const postWhere = keyword
    ? { OR: [{ title: { contains: keyword } }, { content: { contains: keyword } }, { user: { nickname: { contains: keyword } } }] }
    : {};
  const resourceWhere = keyword
    ? { OR: [{ title: { contains: keyword } }, { summary: { contains: keyword } }, { district: { contains: keyword } }] }
    : {};

  const [posts, resources] = await Promise.all([
    prisma.communityPost.findMany({
      where: postWhere,
      include: {
        user: { select: { username: true, nickname: true, role: true } },
        resource: { select: { title: true, slug: true } },
        _count: { select: { likes: true, comments: true, favorites: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.resource.findMany({
      where: resourceWhere,
      include: {
        tags: { include: { tag: { select: { name: true } } } },
        _count: { select: { favorites: true, resourceViews: true, communityPosts: true } },
      },
      orderBy: [{ recommendationWeight: "desc" }, { createdAt: "desc" }],
      take: 100,
    }),
  ]);

  return NextResponse.json({
    ok: true,
    posts,
    resources,
    stats: {
      posts: posts.length,
      hidden: posts.filter((post) => post.status === "HIDDEN").length,
      resources: resources.length,
      featured: resources.filter((resource) => resource.recommendationWeight > 0).length,
    },
  });
}

/** 隐藏/恢复帖子，或推荐/取消推荐文旅资源。 */
export async function PATCH(req: NextRequest) {
  const guard = await guardAdmin();
  if (!guard.ok) return guard.response;

  let body: { kind?: unknown; id?: unknown; action?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "请求格式错误" }, { status: 400 }); }

  const kind = body.kind === "post" || body.kind === "resource" ? body.kind : null;
  const id = typeof body.id === "string" ? body.id : "";
  const action = typeof body.action === "string" ? body.action : "";
  if (!kind || !id) return NextResponse.json({ ok: false, error: "参数不完整" }, { status: 400 });

  if (kind === "post") {
    if (action !== "hide" && action !== "publish") return NextResponse.json({ ok: false, error: "不支持的帖子操作" }, { status: 400 });
    const post = await prisma.communityPost.update({
      where: { id },
      data: { status: action === "hide" ? "HIDDEN" : "PUBLISHED" },
      select: { id: true, status: true },
    });
    revalidatePath("/community");
    revalidatePath(`/community/${id}`);
    revalidatePath("/admin/content");
    return NextResponse.json({ ok: true, data: post });
  }

  if (action !== "feature" && action !== "unfeature") return NextResponse.json({ ok: false, error: "不支持的资源操作" }, { status: 400 });
  const resource = await prisma.resource.update({
    where: { id },
    data: { recommendationWeight: action === "feature" ? 100 : 0 },
    select: { id: true, recommendationWeight: true },
  });
  revalidatePath("/home");
  revalidatePath("/resources");
  revalidatePath("/admin/content");
  return NextResponse.json({ ok: true, data: resource });
}
