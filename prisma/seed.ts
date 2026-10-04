import { prisma } from "../lib/db";
import { hashPassword } from "../lib/auth";

const resources = [
  {
    slug: "sanfangqixiang",
    type: "SCENIC" as const,
    title: "三坊七巷",
    district: "鼓楼区",
    image: "/images/sanfangqixiang.jpg",
    summary: "一片坊巷，半部闽都史。",
    description: "三坊七巷是福州保存较为完整的传统街区，沿着南后街慢慢走，可以看见古厝、名人故居和城市生活交织的样子。",
    history: "三坊七巷形成于晋代，至明清时期逐渐完善，保留了大量明清民居建筑。",
    openTime: "全天开放，街区内景点开放时间以现场公告为准",
    address: "福州市鼓楼区南后街",
    tags: ["历史文化", "适合亲子"],
    recommendationWeight: 100,
  },
  {
    slug: "gushan",
    type: "SCENIC" as const,
    title: "鼓山",
    district: "晋安区",
    image: "/images/gushan.jpg",
    summary: "登高望海，涌泉听钟。",
    description: "鼓山临江面海，山林清幽，涌泉寺和摩崖石刻是这里最值得慢慢探访的文化景观。",
    history: "鼓山自古就是福州名胜，唐宋以来文人雅士多有题刻，涌泉寺始建于唐代。",
    openTime: "06:00-17:30",
    address: "福州市晋安区鼓山镇",
    tags: ["5A", "自然风光", "适合亲子"],
    recommendationWeight: 90,
  },
  {
    slug: "xihu",
    type: "SCENIC" as const,
    title: "福州西湖",
    district: "鼓楼区",
    image: "/images/xihu.jpg",
    summary: "湖光树影里的榕城日常。",
    description: "西湖公园四季皆宜，适合散步、赏花和看一场日落，是福州人熟悉的城市绿洲。",
    history: "福州西湖开凿于晋太康年间，至今已有一千七百多年的历史。",
    openTime: "05:30-22:30",
    address: "福州市鼓楼区湖滨路70号",
    tags: ["城市漫步", "适合亲子"],
    recommendationWeight: 70,
  },
  {
    slug: "moyan",
    type: "ICH" as const,
    title: "寿山石雕",
    district: "晋安区",
    image: "/images/zhenhailou.jpg",
    summary: "一方石头，藏着闽地的巧思。",
    description: "寿山石雕以寿山石为材料，讲究因材施艺，题材涵盖人物、动物、山水和花鸟。",
    history: "寿山石雕技艺源远流长，唐宋以来逐渐形成独特的雕刻风格，是福州重要的传统工艺。",
    openTime: "工作室开放时间以预约为准",
    address: "福州市晋安区寿山乡",
    tags: ["非物质文化遗产", "传统技艺"],
    recommendationWeight: 80,
  },
  {
    slug: "moli",
    type: "ICH" as const,
    title: "茉莉花茶窨制技艺",
    district: "仓山区",
    image: "/images/molihua.jpg",
    summary: "一朵茉莉，窨出一城清香。",
    description: "福州茉莉花茶窨制技艺将茶叶与茉莉鲜花反复拼和，让花香与茶韵自然融合。",
    history: "福州茉莉花茶制作历史悠久，相关传统技艺入选国家级非物质文化遗产代表性项目。",
    openTime: "体验活动需提前预约",
    address: "福州市仓山区城门镇",
    tags: ["世界遗产", "传统技艺", "体验"],
    recommendationWeight: 95,
  },
  {
    slug: "fuzhou-fishball",
    type: "FOOD" as const,
    title: "福州鱼丸",
    district: "鼓楼区",
    image: "/images/shangxiahang.jpg",
    summary: "一口弹牙，是福州人的乡愁。",
    description: "福州鱼丸以鱼肉制皮、肉馅为心，汤清味鲜，是来福州旅行不可错过的地方小吃。",
    history: "鱼丸在福州已有数百年制作传统，选料和手工打制是风味关键。",
    openTime: "各店营业时间不同，建议出发前查询",
    address: "福州市鼓楼区、台江区多家老字号",
    tags: ["地方风味", "适合亲子"],
    recommendationWeight: 85,
  },
] as const;

async function main() {
  for (const resource of resources) {
    const { tags, ...data } = resource;
    await prisma.resource.upsert({
      where: { slug: resource.slug },
    update: {
      ...data,
      tags: {
        deleteMany: {},
        create: tags.map((name) => ({
          tag: {
            connectOrCreate: {
              where: { name },
              create: { name },
            },
          },
        })),
      },
      },
      create: {
        ...data,
        source: "福建文旅公开资料整理（演示数据）",
        tags: {
          create: tags.map((name) => ({
            tag: {
              connectOrCreate: {
                where: { name },
                create: { name },
              },
            },
          })),
        },
      },
    });
  }
  console.log(`已写入 ${resources.length} 条文旅资源`);

  if (process.env.SEED_DEMO_COMMUNITY === "true") {
    await seedCommunityDemo();
  } else {
    console.log("未设置 SEED_DEMO_COMMUNITY=true，跳过社区演示数据");
  }
}

const demoAuthors = [
  { username: "demo_lin", nickname: "林同学" },
  { username: "demo_arong", nickname: "阿榕" },
  { username: "demo_xiaoman", nickname: "小满" },
  { username: "demo_shanhai", nickname: "山海之间" },
  { username: "demo_shiyu", nickname: "石语" },
] as const;

const demoPosts = [
  {
    id: "demo-community-sanfang-checkin",
    author: "demo_lin",
    resourceSlug: "sanfangqixiang",
    type: "CHECKIN" as const,
    title: "在坊巷里，走进千年榕城的人文烟火",
    content: "青砖黛瓦，坊巷纵横。漫步三坊七巷，感受福州的历史沉淀与市井烟火。每一条巷子都有故事，每一扇门后都是时光。",
    rating: null,
    daysAgo: 3,
    recommendationWeight: 100,
  },
  {
    id: "demo-community-jasmine-review",
    author: "demo_arong",
    resourceSlug: "moli",
    type: "REVIEW" as const,
    title: "一杯茉莉花茶，喝出福州的夏天",
    content: "在福州喝到正宗的茉莉花茶，花香清雅，回味甘甜。走进茶庄了解窨制技艺，才知道一杯好茶的来之不易。",
    rating: 5,
    daysAgo: 5,
    recommendationWeight: 95,
  },
  {
    id: "demo-community-fishball-review",
    author: "demo_xiaoman",
    resourceSlug: "fuzhou-fishball",
    type: "REVIEW" as const,
    title: "皮薄馅鲜，汤头清爽",
    content: "来福州一定要吃鱼丸！鱼皮弹嫩，肉馅鲜香，清汤里带着淡淡胡椒香，是很舒服的一口福州味道。",
    rating: 4,
    daysAgo: 4,
    recommendationWeight: 90,
  },
  {
    id: "demo-community-gushan-checkin",
    author: "demo_shanhai",
    resourceSlug: "gushan",
    type: "CHECKIN" as const,
    title: "登上鼓山，看榕城最美的晚霞",
    content: "鼓山的空气太好了，沿着石阶一路向上，俯瞰福州全景。傍晚云层被夕阳染成金色，真的太治愈了。",
    rating: null,
    daysAgo: 6,
    recommendationWeight: 85,
  },
  {
    id: "demo-community-shoushan-review",
    author: "demo_shiyu",
    resourceSlug: "moyan",
    type: "REVIEW" as const,
    title: "一方石头里的闽都匠心",
    content: "第一次近距离看寿山石雕，老师傅会顺着石材天然的色泽和纹理构思作品。细节精巧，很能感受到传统技艺的温度。",
    rating: 5,
    daysAgo: 8,
    recommendationWeight: 80,
  },
] as const;

function dateDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(16, 30, 0, 0);
  return date;
}

async function seedCommunityDemo() {
  const passwordHash = hashPassword("demo123456");
  const authorIds = new Map<string, string>();

  for (const author of demoAuthors) {
    const user = await prisma.user.upsert({
      where: { username: author.username },
      update: { nickname: author.nickname },
      create: {
        username: author.username,
        nickname: author.nickname,
        passwordHash,
        role: "C",
      },
      select: { id: true },
    });
    authorIds.set(author.username, user.id);
  }

  for (const post of demoPosts) {
    const resource = await prisma.resource.findUniqueOrThrow({
      where: { slug: post.resourceSlug },
      select: { id: true, image: true },
    });
    const userId = authorIds.get(post.author);
    if (!userId) throw new Error(`缺少演示用户：${post.author}`);
    const createdAt = dateDaysAgo(post.daysAgo);
    const data = {
      userId,
      resourceId: resource.id,
      type: post.type,
      status: "PUBLISHED" as const,
      title: post.title,
      content: post.content,
      rating: post.rating,
      visitedAt: createdAt,
      recommendationWeight: post.recommendationWeight,
      createdAt,
    };
    const images = resource.image
      ? [{ imageUrl: resource.image, sortOrder: 0 }]
      : [];
    await prisma.communityPost.upsert({
      where: { id: post.id },
      update: {
        ...data,
        images: { deleteMany: {}, create: images },
      },
      create: {
        id: post.id,
        ...data,
        images: { create: images },
      },
    });
  }

  console.log(`已写入 ${demoPosts.length} 条社区演示内容，演示账号密码均为 demo123456`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
