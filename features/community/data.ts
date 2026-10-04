import type { Prisma } from "@/generated/prisma/client";
import type { CommunityPostDto } from "./types";

export const communityPostInclude = {
  user: {
    select: { id: true, username: true, nickname: true },
  },
  resource: {
    select: {
      id: true,
      slug: true,
      title: true,
      type: true,
      district: true,
      image: true,
    },
  },
  images: {
    orderBy: { sortOrder: "asc" },
    select: { id: true, imageUrl: true, sortOrder: true },
  },
  _count: {
    select: { likes: true, favorites: true, comments: true },
  },
} satisfies Prisma.CommunityPostInclude;

export type CommunityPostRecord = Prisma.CommunityPostGetPayload<{
  include: typeof communityPostInclude;
}>;

export function toCommunityPostDto(post: CommunityPostRecord): CommunityPostDto {
  return {
    id: post.id,
    type: post.type,
    title: post.title,
    content: post.content,
    rating: post.rating,
    visitedAt: post.visitedAt?.toISOString() ?? null,
    recommendationWeight: post.recommendationWeight,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    author: post.user,
    resource: post.resource,
    images: post.images,
    counts: {
      likes: post._count.likes,
      favorites: post._count.favorites,
      comments: post._count.comments,
    },
  };
}
