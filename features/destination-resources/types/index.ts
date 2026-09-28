export type ResourceCategory = "景点" | "非遗" | "美食";

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
