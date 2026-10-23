/**
 * @module-note features/merchant/types.ts
 * 商户业务公共契约：区分商品订单、体验课程和报名数据，金额按整数分存储。
 */
export type ProductCategoryValue =
  | "HOMESTAY"
  | "DINING"
  | "HANDICRAFT"
  | "SOUVENIR"
  | "STUDYTOUR";
export type PublishStatusValue = "DRAFT" | "PUBLISHED";
export type OrderStatusValue = "PENDING" | "PAID" | "VERIFIED" | "CANCELLED";
export type EnrollmentStatusValue =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "ATTENDED";

/** 商品类别：民宿 / 餐饮 / 非遗手作 / 伴手礼 / 研学体验 */
export const PRODUCT_CATEGORIES: Array<{
  value: ProductCategoryValue;
  label: string;
}> = [
  { value: "HOMESTAY", label: "民宿" },
  { value: "DINING", label: "餐饮" },
  { value: "HANDICRAFT", label: "非遗手作" },
  { value: "SOUVENIR", label: "伴手礼" },
  { value: "STUDYTOUR", label: "研学体验" },
];

const CATEGORY_LABELS: Record<ProductCategoryValue, string> = {
  HOMESTAY: "民宿",
  DINING: "餐饮",
  HANDICRAFT: "非遗手作",
  SOUVENIR: "伴手礼",
  STUDYTOUR: "研学体验",
};

/**
 * 把商品分类枚举映射为中文名称。
 * 输入：value；类型与可选项见函数签名。
 */
export function productCategoryLabel(value: ProductCategoryValue) {
  return CATEGORY_LABELS[value] ?? value;
}

export const ORDER_STATUS_LABELS: Record<OrderStatusValue, string> = {
  PENDING: "待支付",
  PAID: "待核销",
  VERIFIED: "已核销",
  CANCELLED: "已取消",
};

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatusValue, string> = {
  PENDING: "待确认",
  CONFIRMED: "已确认",
  CANCELLED: "已取消",
  ATTENDED: "已参加",
};

/** 分单位 → 显示价字符串 */
export function formatPrice(cents: number) {
  return `¥${(cents / 100).toFixed(2)}`;
}

export type MerchantBrief = {
  id: string;
  username: string;
  nickname: string | null;
  merchantName: string | null;
};

export type BuyerBrief = {
  id: string;
  username: string;
  nickname: string | null;
};

export type ProductDto = {
  id: string;
  category: ProductCategoryValue;
  title: string;
  summary: string;
  description: string;
  price: number;
  stock: number;
  unit: string | null;
  image: string | null;
  location: string | null;
  status: PublishStatusValue;
  createdAt: string;
  updatedAt: string;
  merchant: MerchantBrief;
  orderCount: number;
};

export type OrderDto = {
  id: string;
  orderNo: string;
  quantity: number;
  amount: number;
  status: OrderStatusValue;
  verifyCode: string;
  contact: string | null;
  remark: string | null;
  paidAt: string | null;
  verifiedAt: string | null;
  createdAt: string;
  product: { id: string; title: string; image: string | null; unit: string | null };
  merchant: MerchantBrief;
  buyer: BuyerBrief;
};

/** 商户端订单：不含核销码（核销码只给买家出示，商户需向顾客索取） */
export type MerchantOrderDto = Omit<OrderDto, "verifyCode">;

export type StudioWorkDto = {
  id: string;
  title: string;
  description: string;
  image: string | null;
  sortOrder: number;
  createdAt: string;
  merchant: MerchantBrief;
};

export type ExperienceClassDto = {
  id: string;
  title: string;
  summary: string;
  price: number;
  capacity: number;
  schedule: string;
  location: string | null;
  image: string | null;
  status: PublishStatusValue;
  createdAt: string;
  merchant: MerchantBrief;
  enrollmentCount: number;
};

export type EnrollmentDto = {
  id: string;
  status: EnrollmentStatusValue;
  contact: string | null;
  remark: string | null;
  createdAt: string;
  user: BuyerBrief;
  class: { id: string; title: string; schedule: string };
};
