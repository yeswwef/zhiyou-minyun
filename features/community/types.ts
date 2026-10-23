/**
 * @module-note features/community/types.ts
 * 社区业务：围绕帖子、图片、评价与关注关系组织数据及交互。
 */
export type CommunityPostTypeValue = "CHECKIN" | "REVIEW";
export type CommunityResourceType = "SCENIC" | "ICH" | "FOOD";

export type CommunityResourceOption = {
  slug: string;
  title: string;
  type: CommunityResourceType;
  image: string | null;
};

export type CommunityPostDto = {
  id: string;
  type: CommunityPostTypeValue;
  title: string;
  content: string;
  rating: number | null;
  visitedAt: string | null;
  recommendationWeight: number;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    username: string;
    nickname: string | null;
  };
  resource: {
    id: string;
    slug: string;
    title: string;
    type: CommunityResourceType;
    district: string | null;
    image: string | null;
  };
  images: Array<{
    id: string;
    imageUrl: string;
    sortOrder: number;
  }>;
  counts: {
    likes: number;
    favorites: number;
    comments: number;
  };
};

export type CommunityCommentDto = {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    username: string;
    nickname: string | null;
  };
};

/**
 * 将资源类型枚举转换为中文标签。
 * 输入：type；类型与可选项见函数签名。
 */
export function resourceTypeLabel(type: CommunityResourceType) {
  return type === "SCENIC" ? "景点" : type === "ICH" ? "非遗" : "美食";
}

/**
 * 将打卡或评价类型转换为展示标签。
 * 输入：type；类型与可选项见函数签名。
 */
export function postTypeLabel(type: CommunityPostTypeValue) {
  return type === "CHECKIN" ? "打卡" : "评价";
}

/**
 * 将日期转换为社区列表展示格式。
 * 输入：value；类型与可选项见函数签名。
 */
export function formatCommunityDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  const delta = Date.now() - date.getTime();
  const days = Math.floor(delta / 86_400_000);
  if (days <= 0) return "今天";
  if (days === 1) return "昨天";
  if (days < 30) return `${days}天前`;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
