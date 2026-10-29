/**
 * @module-note app/api/admin/users/route.ts
 * 平台管理中心：用户列表、角色调整与账号注销/恢复接口。
 */
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { guardAdmin } from "@/lib/roles";

const ROLES = ["C", "B", "ADMIN", "TICKET_ADMIN"] as const;
type AdminRole = (typeof ROLES)[number];

const userSelect = {
  id: true,
  username: true,
  nickname: true,
  role: true,
  merchantName: true,
  disabledAt: true,
  createdAt: true,
  _count: { select: { communityPosts: true, buyerOrders: true, merchantOrders: true, ticketBookings: true, products: true, favorites: true, studioWorks: true, experienceClasses: true } },
} as const;

/** 查询用户列表，附带内容、订单、预约与商品数量。 */
export async function GET(req: NextRequest) {
  const guard = await guardAdmin();
  if (!guard.ok) return guard.response;

  const keyword = (req.nextUrl.searchParams.get("q") || "").trim().slice(0, 40);
  const roleParam = req.nextUrl.searchParams.get("role") || "";
  const role = ROLES.includes(roleParam as AdminRole) ? (roleParam as AdminRole) : undefined;

  const [data, total, groups] = await Promise.all([
    prisma.user.findMany({
      where: {
        ...(role ? { role } : {}),
        ...(keyword
          ? { OR: [{ username: { contains: keyword } }, { nickname: { contains: keyword } }, { merchantName: { contains: keyword } }] }
          : {}),
      },
      select: userSelect,
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.user.count(),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
  ]);

  const stats = { C: 0, B: 0, ADMIN: 0, TICKET_ADMIN: 0 } as Record<AdminRole, number>;
  for (const group of groups) stats[group.role] = group._count._all;

  return NextResponse.json({ ok: true, data, total, stats, selfId: guard.userId });
}

/** 调整用户角色，或注销/恢复其他端账号。 */
export async function PATCH(req: NextRequest) {
  const guard = await guardAdmin();
  if (!guard.ok) return guard.response;

  let body: { id?: unknown; role?: unknown; action?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "请求格式错误" }, { status: 400 }); }

  const id = typeof body.id === "string" ? body.id : "";
  const role = typeof body.role === "string" && ROLES.includes(body.role as AdminRole) ? (body.role as AdminRole) : null;
  const action = body.action === "disable" || body.action === "enable" ? body.action : null;
  if (!id) return NextResponse.json({ ok: false, error: "用户不合法" }, { status: 400 });
  if (id === guard.userId) return NextResponse.json({ ok: false, error: "不能操作自己的账号" }, { status: 400 });

  const target = await prisma.user.findUnique({
    where: { id },
    select: { role: true, username: true, nickname: true, merchantName: true, disabledAt: true },
  });
  if (!target) return NextResponse.json({ ok: false, error: "用户不存在" }, { status: 404 });
  if (target.role === "ADMIN") {
    return NextResponse.json({ ok: false, error: "平台管理员账号不能在此调整或注销" }, { status: 400 });
  }

  if (action) {
    const data = await prisma.user.update({
      where: { id },
      data: { disabledAt: action === "disable" ? new Date() : null },
      select: userSelect,
    });
    revalidatePath("/admin/users");
    revalidatePath("/admin/commerce");
    return NextResponse.json({ ok: true, data });
  }

  if (!role) return NextResponse.json({ ok: false, error: "角色不合法" }, { status: 400 });

  const data = await prisma.user.update({
    where: { id },
    data: {
      role,
      // 新商户若没有店铺名，用昵称/账号补一个可编辑的默认值。
      ...(role === "B" && !target.merchantName ? { merchantName: target.nickname || target.username } : {}),
    },
    select: userSelect,
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/commerce");
  return NextResponse.json({ ok: true, data });
}
