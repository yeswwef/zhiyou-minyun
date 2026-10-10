import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";

const userSelect = {
  id: true,
  username: true,
  nickname: true,
  role: true,
  merchantName: true,
  createdAt: true,
} as const;

export async function GET() {
  const user = await getSessionUser();
  return NextResponse.json({ user });
}

/** 更新个人资料：昵称、店铺 / 工作室名称（仅商户） */
export async function PATCH(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "请先登录" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const data: { nickname?: string | null; merchantName?: string } = {};

  if (body?.nickname !== undefined) {
    const nickname = String(body.nickname ?? "").trim();
    if (nickname.length > 30) {
      return NextResponse.json(
        { ok: false, error: "昵称不能超过 30 个字符" },
        { status: 400 },
      );
    }
    data.nickname = nickname || null;
  }

  if (body?.merchantName !== undefined) {
    const current = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (current?.role !== "B") {
      return NextResponse.json(
        { ok: false, error: "仅商户账号可修改店铺名称" },
        { status: 400 },
      );
    }
    const merchantName = String(body.merchantName ?? "").trim();
    if (!merchantName) {
      return NextResponse.json(
        { ok: false, error: "店铺 / 工作室名称不能为空" },
        { status: 400 },
      );
    }
    if (merchantName.length > 50) {
      return NextResponse.json(
        { ok: false, error: "店铺名称不能超过 50 个字符" },
        { status: 400 },
      );
    }
    data.merchantName = merchantName;
  }

  if (!Object.keys(data).length) {
    return NextResponse.json({ ok: false, error: "没有需要更新的内容" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: userSelect,
  });

  return NextResponse.json({ ok: true, user });
}
