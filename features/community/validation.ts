import type { CommunityPostTypeValue } from "./types";

export type CommunityPostInput = {
  type: CommunityPostTypeValue;
  resourceId: string;
  title: string;
  content: string;
  rating: number | null;
  visitedAt: Date | null;
};

export class CommunityValidationError extends Error {}

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function parseCommunityPostForm(formData: FormData): CommunityPostInput {
  const type = text(formData, "type");
  if (type !== "CHECKIN" && type !== "REVIEW") {
    throw new CommunityValidationError("请选择打卡或评价类型");
  }

  const resourceId = text(formData, "resourceId");
  if (!resourceId) throw new CommunityValidationError("请选择关联资源");

  const title = text(formData, "title");
  if (!title || title.length > 80) {
    throw new CommunityValidationError("标题不能为空，最多 80 个字");
  }

  const content = text(formData, "content");
  if (!content || content.length > 3000) {
    throw new CommunityValidationError("正文不能为空，最多 3000 个字");
  }

  const ratingText = text(formData, "rating");
  const rating = ratingText ? Number(ratingText) : null;
  if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
    throw new CommunityValidationError("评分只能是 1～5 星");
  }
  if (type === "REVIEW" && rating === null) {
    throw new CommunityValidationError("评价必须选择 1～5 星");
  }

  const visitedAtText = text(formData, "visitedAt");
  const visitedAt = visitedAtText ? new Date(`${visitedAtText}T12:00:00`) : null;
  if (visitedAt && Number.isNaN(visitedAt.getTime())) {
    throw new CommunityValidationError("游览日期格式不正确");
  }

  return { type, resourceId, title, content, rating, visitedAt };
}

export function getImageFiles(formData: FormData) {
  return formData
    .getAll("images")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
}
