import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  createSessionToken,
  hashPassword,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const username = String(body?.username ?? "").trim();
  const password = String(body?.password ?? "");
  const nickname = body?.nickname ? String(body.nickname).trim() : null;

  if (!username || !password) {
    return NextResponse.json(
      { ok: false, error: "用户名和密码不能为空" },
      { status: 400 },
    );
  }
  if (username.length < 2 || username.length > 30) {
    return NextResponse.json(
      { ok: false, error: "用户名长度需在 2-30 个字符之间" },
      { status: 400 },
    );
  }
  if (password.length < 6) {
    return NextResponse.json(
      { ok: false, error: "密码至少 6 位" },
      { status: 400 },
    );
  }

  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) {
    return NextResponse.json(
      { ok: false, error: "该用户名已被注册" },
      { status: 409 },
    );
  }

  const user = await prisma.user.create({
    data: { username, passwordHash: hashPassword(password), nickname },
    select: { id: true, username: true, nickname: true, role: true },
  });

  const response = NextResponse.json({ ok: true, user });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: createSessionToken(user.id),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return response;
}
