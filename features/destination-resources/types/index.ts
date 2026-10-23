/**
 * @module-note features/destination-resources/types/index.ts
 * 文旅资源展示与交互：资源卡片连接收藏、行程及详情入口。
 */
export type ResourceCategory = "景点" | "非遗" | "美食";
//类型
export type DestinationResource = {
  id: string;
  name: string;
  category: ResourceCategory;
  district: string;
  tags: string[];
  image: string;
  summary: string;
  description: string;
  history: string;
  openingHours: string;
  address: string;
};
