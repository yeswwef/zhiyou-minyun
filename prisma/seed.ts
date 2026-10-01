import { prisma } from "../lib/db";

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
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
