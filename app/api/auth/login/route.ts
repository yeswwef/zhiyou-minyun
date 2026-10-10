import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  verifyPassword,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const username = String(body?.username ?? "").trim();
  const password = String(body?.password ?? "");
  const endpoint = String(body?.endpoint ?? "");

  if (!username || !password) {
    return NextResponse.json(
      { ok: false, error: "请输入用户名和密码" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json(
      { ok: false, error: "用户名或密码错误" },
      { status: 401 },
    );
  }
  const expectedRole = endpoint === "admin" ? "ADMIN" : endpoint === "merchant" ? "B" : endpoint === "guest" ? "C" : null;
  if (expectedRole && user.role !== expectedRole) {
    return NextResponse.json({ ok: false, error: "账号身份与所选登录端不匹配" }, { status: 403 });
  }

  const response = NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      role: user.role,
    },
  });
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
