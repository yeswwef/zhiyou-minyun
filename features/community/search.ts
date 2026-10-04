import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

const SEARCH_FILLER_WORDS = [
  "慢游",
  "漫游",
  "攻略",
  "推荐",
  "打卡",
  "评价",
  "游记",
  "日记",
  "故事",
  "艺术",
];

/**
 * 社区搜索既匹配帖子正文，也识别“资源名 + 攻略/漫游”等自然表达。
 * 例如“三坊七巷漫游”会额外提取“三坊七巷”，从而命中关联资源。
 */
export async function buildCommunitySearchWhere(
  rawQuery: string,
): Promise<Prisma.CommunityPostWhereInput | undefined> {
  const query = rawQuery.trim().slice(0, 60);
  if (!query) return undefined;

  const compact = query.replace(/\s+/g, "");
  const simplified = SEARCH_FILLER_WORDS.reduce(
    (value, word) => value.replaceAll(word, ""),
    compact,
  );
  const terms = [...new Set([query, compact, simplified])].filter(
    (term) => term.length >= 2,
  );

  const resources = await prisma.resource.findMany({
    select: { id: true, title: true },
  });
  const matchedResourceIds = resources
    .filter((resource) =>
      terms.some(
        (term) => term.includes(resource.title) || resource.title.includes(term),
      ),
    )
    .map((resource) => resource.id);

  return {
    OR: [
      ...terms.flatMap((term) => [
        { title: { contains: term } },
        { content: { contains: term } },
        { resource: { is: { title: { contains: term } } } },
      ]),
      ...(matchedResourceIds.length
        ? [{ resourceId: { in: matchedResourceIds } }]
        : []),
    ],
  };
}
