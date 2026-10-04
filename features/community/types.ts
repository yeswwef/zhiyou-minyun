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

export function resourceTypeLabel(type: CommunityResourceType) {
  return type === "SCENIC" ? "景点" : type === "ICH" ? "非遗" : "美食";
}

export function postTypeLabel(type: CommunityPostTypeValue) {
  return type === "CHECKIN" ? "打卡" : "评价";
}

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
