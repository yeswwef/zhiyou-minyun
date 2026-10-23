/**
 * @module-note app/api/classes/[id]/enroll/route.ts
 * 体验课程／指定id／课程报名接口。HTTP请求进入具名方法后执行校验与业务处理，再以响应返回；权限、错误码和数据范围以各分支为准。
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { guardVisitor } from "@/lib/roles";

/** C 端：报名非遗体验课 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardVisitor();
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const { id } = await params;
  const klass = await prisma.experienceClass.findFirst({
    where: { id, status: "PUBLISHED" },
    select: { id: true, capacity: true, _count: { select: { enrollments: true } } },
  });
  if (!klass) {
    return NextResponse.json({ ok: false, error: "课程不存在或已下架" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const existing = await prisma.classEnrollment.findUnique({
    where: { classId_userId: { classId: id, userId } },
    select: { id: true, status: true },
  });

  if (existing && existing.status !== "CANCELLED") {
    return NextResponse.json({ ok: false, error: "你已报名该课程" }, { status: 409 });
  }

  if (klass._count.enrollments >= klass.capacity) {
    return NextResponse.json({ ok: false, error: "名额已满" }, { status: 400 });
  }

  const contact = body?.contact ? String(body.contact).trim() : null;
  const remark = body?.remark ? String(body.remark).trim() : null;

  const enrollment = existing
    ? await prisma.classEnrollment.update({
        where: { id: existing.id },
        data: { status: "PENDING", contact, remark },
      })
    : await prisma.classEnrollment.create({
        data: { classId: id, userId, contact, remark },
      });

  return NextResponse.json({ ok: true, item: { id: enrollment.id } }, { status: 201 });
}

/** C 端：取消报名 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardVisitor();
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const { id } = await params;
  const existing = await prisma.classEnrollment.findUnique({
    where: { classId_userId: { classId: id, userId } },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "没有报名记录" }, { status: 404 });
  }

  await prisma.classEnrollment.update({
    where: { id: existing.id },
    data: { status: "CANCELLED" },
  });

  return NextResponse.json({ ok: true });
}
