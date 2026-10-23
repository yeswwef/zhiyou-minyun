/**
 * @module-note features/merchant/data.ts
 * 商户业务公共契约：区分商品订单、体验课程和报名数据，金额按整数分存储。
 */
import type { Prisma } from "@/generated/prisma/client";
import type {
  EnrollmentDto,
  ExperienceClassDto,
  MerchantOrderDto,
  OrderDto,
  ProductDto,
  StudioWorkDto,
} from "./types";

const merchantSelect = {
  select: {
    id: true,
    username: true,
    nickname: true,
    merchantName: true,
  },
} as const;

const buyerSelect = {
  select: { id: true, username: true, nickname: true },
} as const;

export const productInclude = {
  merchant: merchantSelect,
  _count: { select: { orders: true } },
} satisfies Prisma.ProductInclude;

export type ProductRecord = Prisma.ProductGetPayload<{
  include: typeof productInclude;
}>;

/**
 * 将商品及关联商户数据转换为客户端 DTO。
 * 输入：product；类型与可选项见函数签名。
 */
export function toProductDto(product: ProductRecord): ProductDto {
  return {
    id: product.id,
    category: product.category,
    title: product.title,
    summary: product.summary,
    description: product.description ?? "",
    price: product.price,
    stock: product.stock,
    unit: product.unit,
    image: product.image,
    location: product.location,
    status: product.status,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    merchant: product.merchant,
    orderCount: product._count.orders,
  };
}

export const orderInclude = {
  product: { select: { id: true, title: true, image: true, unit: true } },
  merchant: merchantSelect,
  buyer: buyerSelect,
} satisfies Prisma.OrderInclude;

export type OrderRecord = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

/**
 * 转换游客可见的商品订单信息。
 * 输入：order；类型与可选项见函数签名。
 */
export function toOrderDto(order: OrderRecord): OrderDto {
  return {
    id: order.id,
    orderNo: order.orderNo,
    quantity: order.quantity,
    amount: order.amount,
    status: order.status,
    verifyCode: order.verifyCode,
    contact: order.contact,
    remark: order.remark,
    paidAt: order.paidAt?.toISOString() ?? null,
    verifiedAt: order.verifiedAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
    product: order.product,
    merchant: order.merchant,
    buyer: order.buyer,
  };
}

/** 商户端视图：刻意不返回核销码 */
export function toMerchantOrderDto(order: OrderRecord): MerchantOrderDto {
  const dto = toOrderDto(order);
  return {
    id: dto.id,
    orderNo: dto.orderNo,
    quantity: dto.quantity,
    amount: dto.amount,
    status: dto.status,
    contact: dto.contact,
    remark: dto.remark,
    paidAt: dto.paidAt,
    verifiedAt: dto.verifiedAt,
    createdAt: dto.createdAt,
    product: dto.product,
    merchant: dto.merchant,
    buyer: dto.buyer,
  };
}

export const studioWorkInclude = {
  merchant: merchantSelect,
} satisfies Prisma.StudioWorkInclude;

export type StudioWorkRecord = Prisma.StudioWorkGetPayload<{
  include: typeof studioWorkInclude;
}>;

/**
 * 转换非遗工作室作品信息。
 * 输入：work；类型与可选项见函数签名。
 */
export function toStudioWorkDto(work: StudioWorkRecord): StudioWorkDto {
  return {
    id: work.id,
    title: work.title,
    description: work.description,
    image: work.image,
    sortOrder: work.sortOrder,
    createdAt: work.createdAt.toISOString(),
    merchant: work.merchant,
  };
}

export const experienceClassInclude = {
  merchant: merchantSelect,
  _count: { select: { enrollments: true } },
} satisfies Prisma.ExperienceClassInclude;

export type ExperienceClassRecord = Prisma.ExperienceClassGetPayload<{
  include: typeof experienceClassInclude;
}>;

/**
 * 转换体验课程及报名相关信息。
 * 输入：item；类型与可选项见函数签名。
 */
export function toExperienceClassDto(
  item: ExperienceClassRecord,
): ExperienceClassDto {
  return {
    id: item.id,
    title: item.title,
    summary: item.summary,
    price: item.price,
    capacity: item.capacity,
    schedule: item.schedule,
    location: item.location,
    image: item.image,
    status: item.status,
    createdAt: item.createdAt.toISOString(),
    merchant: item.merchant,
    enrollmentCount: item._count.enrollments,
  };
}

export const enrollmentInclude = {
  user: buyerSelect,
  class: { select: { id: true, title: true, schedule: true } },
} satisfies Prisma.ClassEnrollmentInclude;

export type EnrollmentRecord = Prisma.ClassEnrollmentGetPayload<{
  include: typeof enrollmentInclude;
}>;

/**
 * 转换课程报名记录。
 * 输入：enrollment；类型与可选项见函数签名。
 */
export function toEnrollmentDto(enrollment: EnrollmentRecord): EnrollmentDto {
  return {
    id: enrollment.id,
    status: enrollment.status,
    contact: enrollment.contact,
    remark: enrollment.remark,
    createdAt: enrollment.createdAt.toISOString(),
    user: enrollment.user,
    class: enrollment.class,
  };
}

/** 生成订单号：ZY + 时间戳 + 随机 */
export function createOrderNo() {
  const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `ZY${stamp}${random}`;
}

/** 生成核销码：6 位数字 */
export function createVerifyCode() {
  return String(Math.floor(Math.random() * 900000 + 100000));
}
