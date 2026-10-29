/**
 * @module-note app/api/auth/me/route.ts
 * 身份认证／当前用户资料接口。HTTP请求进入具名方法后执行校验与业务处理，再以响应返回；权限、错误码和数据范围以各分支为准。
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";

const userSelect = {
  id: true,
  username: true,
  nickname: true,
  role: true,
  merchantName: true,
  merchantAddress: true,
  legalPerson: true,
  merchantPhone: true,
  creditCode: true,
  merchantIntro: true,
  createdAt: true,
} as const;

/**
 * 读取身份认证／当前用户资料数据，处理对应 GET 请求。
 * 依赖当前会话身份，匿名访问和角色限制由下方分支处理。
 */
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
  const data: {
    nickname?: string | null;
    merchantName?: string;
    merchantAddress?: string | null;
    legalPerson?: string | null;
    merchantPhone?: string | null;
    creditCode?: string | null;
    merchantIntro?: string | null;
  } = {};

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

  const merchantFields = ["merchantName", "merchantAddress", "legalPerson", "merchantPhone", "creditCode", "merchantIntro"] as const;
  if (merchantFields.some((field) => body?.[field] !== undefined)) {
    const current = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (current?.role !== "B") {
      return NextResponse.json(
        { ok: false, error: "仅商户账号可修改店铺资料" },
        { status: 400 },
      );
    }

    if (body?.merchantName !== undefined) {
      const merchantName = String(body.merchantName ?? "").trim();
      if (!merchantName) {
        return NextResponse.json({ ok: false, error: "店铺 / 工作室名称不能为空" }, { status: 400 });
      }
      if (merchantName.length > 50) {
        return NextResponse.json({ ok: false, error: "店铺名称不能超过 50 个字符" }, { status: 400 });
      }
      data.merchantName = merchantName;
    }

    const optionalText = (field: "merchantAddress" | "legalPerson" | "merchantPhone" | "creditCode" | "merchantIntro", max: number, label: string) => {
      if (body?.[field] === undefined) return;
      const value = String(body[field] ?? "").trim();
      if (value.length > max) throw new Error(`${label}不能超过 ${max} 个字符`);
      data[field] = value || null;
    };

    try {
      optionalText("merchantAddress", 100, "经营地址");
      optionalText("legalPerson", 30, "法定代表人");
      optionalText("merchantPhone", 30, "联系电话");
      optionalText("creditCode", 30, "统一社会信用代码");
      optionalText("merchantIntro", 400, "店铺简介");
    } catch (error) {
      return NextResponse.json(
        { ok: false, error: error instanceof Error ? error.message : "资料格式不正确" },
        { status: 400 },
      );
    }
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
