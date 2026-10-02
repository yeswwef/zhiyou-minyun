import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId, hashPassword, verifyPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "请先登录" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const currentPassword = String(body?.currentPassword ?? "");
  const newPassword = String(body?.newPassword ?? "");

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { ok: false, error: "请填写当前密码和新密码" },
      { status: 400 },
    );
  }
  if (newPassword.length < 6) {
    return NextResponse.json(
      { ok: false, error: "新密码至少 6 位" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !verifyPassword(currentPassword, user.passwordHash)) {
    return NextResponse.json(
      { ok: false, error: "当前密码错误" },
      { status: 401 },
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hashPassword(newPassword) },
  });

  return NextResponse.json({ ok: true });
}
