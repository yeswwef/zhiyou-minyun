import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const user = await getSessionUser();
  return NextResponse.json({ user });
}

export async function PATCH(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "请先登录" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const nickname = typeof body?.nickname === "string" ? body.nickname.trim() : null;
  if (nickname && nickname.length > 30) {
    return NextResponse.json({ ok: false, error: "昵称不能超过 30 个字符" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { nickname: nickname || null },
    select: {
      id: true,
      username: true,
      nickname: true,
      role: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ ok: true, user });
}
