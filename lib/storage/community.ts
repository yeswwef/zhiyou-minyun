/**
 * @module-note lib/storage/community.ts
 * 公共服务层：被页面或接口复用；涉及数据库、会话和基础设施的逻辑应留在服务端。
 */
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

export const COMMUNITY_MAX_IMAGES = 6;
export const COMMUNITY_MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const MIME_EXTENSIONS = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

/**
 * 解析社区图片上传目录。
 */
function uploadDirectory() {
  return path.join(process.cwd(), "public", "uploads", "community");
}

export class CommunityImageError extends Error {}

/**
 * 校验图片数量、大小及允许类型。
 * 输入：files；类型与可选项见函数签名。
 */
export function validateCommunityImages(files: File[]) {
  if (files.length > COMMUNITY_MAX_IMAGES) {
    throw new CommunityImageError(`最多上传 ${COMMUNITY_MAX_IMAGES} 张图片`);
  }

  for (const file of files) {
    if (!MIME_EXTENSIONS.has(file.type)) {
      throw new CommunityImageError("图片仅支持 JPG、PNG、WebP 格式");
    }
    if (file.size <= 0 || file.size > COMMUNITY_MAX_IMAGE_BYTES) {
      throw new CommunityImageError("每张图片大小必须在 5MB 以内");
    }
  }
}

/**
 * 写入已校验的图片并返回公开访问路径。
 * 输入：files；类型与可选项见函数签名。
 */
export async function saveCommunityImages(files: File[]): Promise<string[]> {
  validateCommunityImages(files);
  if (!files.length) return [];

  const directory = uploadDirectory();
  await mkdir(directory, { recursive: true });
  const saved: string[] = [];

  try {
    for (const file of files) {
      const extension = MIME_EXTENSIONS.get(file.type)!;
      const filename = `${randomUUID()}.${extension}`;
      await writeFile(
        path.join(directory, filename),
        Buffer.from(await file.arrayBuffer()),
      );
      saved.push(`/uploads/community/${filename}`);
    }
    return saved;
  } catch (error) {
    await deleteCommunityImages(saved);
    throw error;
  }
}

/**
 * 删除对应本地社区上传图片，限定操作在上传目录。
 * 输入：urls；类型与可选项见函数签名。
 */
export async function deleteCommunityImages(urls: string[]) {
  const files = urls
    .filter((url) => url.startsWith("/uploads/community/"))
    .map((url) => path.join(uploadDirectory(), path.basename(url)));
  await Promise.allSettled(files.map((file) => unlink(file)));
}
