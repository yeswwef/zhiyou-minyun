/**
 * @module-note app/api/auth/register/route.ts
 * 身份认证／注册接口。HTTP请求进入具名方法后执行校验与业务处理，再以响应返回；权限、错误码和数据范围以各分支为准。
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  createSessionToken,
  hashPassword,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
} from "@/lib/auth";

/**
 * 提交或创建身份认证／注册数据，处理对应 POST 请求。
 * 数据库操作：prisma.user.findUnique、prisma.user.create；注意相应的归属过滤与事务边界。
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const username = String(body?.username ?? "").trim();
  const password = String(body?.password ?? "");
  const nickname = body?.nickname ? String(body.nickname).trim() : null;
  const role = body?.role === "B" ? "B" : "C";
  const merchantName =
    role === "B" && body?.merchantName ? String(body.merchantName).trim() : null;

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
  if (role === "B" && !merchantName) {
    return NextResponse.json(
      { ok: false, error: "请填写店铺 / 工作室名称" },
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
    data: {
      username,
      passwordHash: hashPassword(password),
      nickname,
      role,
      merchantName,
    },
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
