/**
 * @module-note prisma/seed.ts
 * 数据库初始化脚本：用于开发演示数据，运行会写入数据库，不能当作只读检查。
 */
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

/**
 * 执行 seed.ts 的命令行主流程，初始化依赖并处理最终结果。
 * 数据库操作：prisma.resource.upsert；注意相应的归属过滤与事务边界。
 */
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

  if (process.env.SEED_DEMO_MERCHANT === "true") {
    await seedMerchantDemo();
  } else {
    console.log("未设置 SEED_DEMO_MERCHANT=true，跳过商户演示数据");
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

/**
 * 生成距今天指定天数的演示日期。
 * 输入：days；类型与可选项见函数签名。
 */
function dateDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(16, 30, 0, 0);
  return date;
}

/**
 * 写入社区演示帖子与互动数据，供本地开发验证。
 * 数据库操作：prisma.user.upsert、prisma.resource.findUniqueOrThrow、prisma.communityPost.upsert；注意相应的归属过滤与事务边界。
 */
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

const DEMO_MERCHANT = {
  username: "demo_merchant",
  nickname: "三坊七巷文创店",
  merchantName: "福州三坊七巷文创店",
};

const DEMO_BUYERS = [
  { username: "demo_buyer_chen", nickname: "陈小雨" },
  { username: "demo_buyer_lin", nickname: "林海" },
  { username: "demo_buyer_su", nickname: "苏文" },
] as const;

const DEMO_PRODUCTS = [
  {
    id: "product-jasmine-tea",
    category: "SOUVENIR" as const,
    title: "三坊七巷茉莉花茶礼盒",
    summary: "把福州的夏天装进礼盒，花香清雅。",
    description: "选用福州传统窨制工艺茉莉花茶，花香入茶、回味甘甜，适合送礼或带回家慢慢喝。",
    price: 6800,
    stock: 120,
    unit: "盒",
    image: "/images/molihua.jpg",
    location: "福州市鼓楼区南后街",
  },
  {
    id: "product-homestay",
    category: "HOMESTAY" as const,
    title: "坊巷古厝民宿 · 双人间",
    summary: "住在老坊巷里，推窗就是闽都烟火。",
    description: "位于三坊七巷周边的古厝改造民宿，保留马鞍墙与木结构，步行可达南后街。",
    price: 39800,
    stock: 20,
    unit: "晚",
    image: "/images/sanfangqixiang.jpg",
    location: "福州市鼓楼区南后街",
  },
  {
    id: "product-fishball",
    category: "DINING" as const,
    title: "福州鱼丸双人套餐",
    summary: "手工打制的弹牙鱼丸，清汤见真味。",
    description: "现打鱼丸配清汤，另含拌面与茉莉花茶，两人份，适合午后小食。",
    price: 8800,
    stock: 200,
    unit: "份",
    image: "/images/shangxiahang.jpg",
    location: "福州市台江区上下杭",
  },
  {
    id: "product-shoushan",
    category: "HANDICRAFT" as const,
    title: "寿山石雕小摆件 · 福",
    summary: "传承人手工雕刻，一方石头一只福。",
    description: "以寿山石为材，因材施艺雕刻「福」字小摆件，附作品证书，可作桌面陈设。",
    price: 26800,
    stock: 30,
    unit: "件",
    image: "/images/zhenhailou.jpg",
    location: "福州市晋安区寿山乡",
  },
  {
    id: "product-study-tour",
    category: "STUDYTOUR" as const,
    title: "三坊七巷研学半日营",
    summary: "跟着讲解走坊巷，读懂半部闽都史。",
    description: "半日研学路线，含专业讲解、非遗手作体验与研学手册，适合亲子与学生团队。",
    price: 12800,
    stock: 60,
    unit: "人",
    image: "/images/gushan.jpg",
    location: "福州市鼓楼区三坊七巷",
  },
];

const DEMO_WORKS = [
  {
    id: "work-shoushan-carving",
    title: "寿山石雕《梅雀争春》",
    description: "顺着石材天然的色泽与纹理构思，以梅花与雀鸟为题，是工作室的代表作品之一。",
    image: "/images/zhenhailou.jpg",
    sortOrder: 1,
  },
  {
    id: "work-jasmine-tea-seat",
    title: "茉莉花茶手作茶席",
    description: "一套以茉莉花为主题的茶席，含手作茶巾与竹制茶则，呈现福州夏日的清雅。",
    image: "/images/molihua.jpg",
    sortOrder: 2,
  },
  {
    id: "work-min-du-sachet",
    title: "闽都香囊手作",
    description: "以古厝纹样为灵感的手缝香囊，内填本地香草，可作随身小物或旅伴伴手礼。",
    image: "/images/shangxiahang.jpg",
    sortOrder: 3,
  },
];

const DEMO_CLASSES = [
  {
    id: "class-shoushan-intro",
    title: "寿山石雕入门体验课",
    summary: "跟随传承人认识寿山石，亲手刻一枚属于自己的小印章。",
    price: 16800,
    capacity: 12,
    schedule: "每周六 14:00-16:00",
    location: "福州市晋安区寿山乡",
    image: "/images/zhenhailou.jpg",
  },
  {
    id: "class-jasmine-tea",
    title: "茉莉花茶窨制体验课",
    summary: "了解窨制技艺，亲手窨一罐茉莉花茶带回家。",
    price: 9800,
    capacity: 20,
    schedule: "每周日 10:00-12:00",
    location: "福州市仓山区城门镇",
    image: "/images/molihua.jpg",
  },
];

const DEMO_ORDERS = [
  { seq: 1, productId: "product-jasmine-tea", buyer: 0, quantity: 2, status: "VERIFIED" as const, daysAgo: 1 },
  { seq: 2, productId: "product-fishball", buyer: 1, quantity: 1, status: "VERIFIED" as const, daysAgo: 2 },
  { seq: 3, productId: "product-homestay", buyer: 2, quantity: 1, status: "PAID" as const, daysAgo: 1 },
  { seq: 4, productId: "product-shoushan", buyer: 0, quantity: 1, status: "PAID" as const, daysAgo: 0 },
  { seq: 5, productId: "product-study-tour", buyer: 1, quantity: 3, status: "PENDING" as const, daysAgo: 0 },
  { seq: 6, productId: "product-jasmine-tea", buyer: 2, quantity: 1, status: "VERIFIED" as const, daysAgo: 4 },
  { seq: 7, productId: "product-fishball", buyer: 0, quantity: 2, status: "VERIFIED" as const, daysAgo: 5 },
  { seq: 8, productId: "product-homestay", buyer: 1, quantity: 2, status: "VERIFIED" as const, daysAgo: 6 },
  { seq: 9, productId: "product-study-tour", buyer: 2, quantity: 2, status: "CANCELLED" as const, daysAgo: 3 },
  { seq: 10, productId: "product-shoushan", buyer: 1, quantity: 1, status: "VERIFIED" as const, daysAgo: 3 },
];

const DEMO_ENROLLMENTS = [
  { id: "enroll-shoushan-1", classId: "class-shoushan-intro", buyer: 0, status: "CONFIRMED" as const, daysAgo: 2, contact: "13800000001" },
  { id: "enroll-shoushan-2", classId: "class-shoushan-intro", buyer: 1, status: "PENDING" as const, daysAgo: 1, contact: "13800000002" },
  { id: "enroll-jasmine-1", classId: "class-jasmine-tea", buyer: 2, status: "ATTENDED" as const, daysAgo: 5, contact: "13800000003" },
];

/**
 * 写入商户商品、课程与演示业务数据。
 * 数据库操作：prisma.user.upsert、prisma.product.upsert、prisma.studioWork.upsert、prisma.experienceClass.upsert、prisma.order.upsert、prisma.classEnrollment.upsert；注意相应的归属过滤与事务边界。
 */
async function seedMerchantDemo() {
  const passwordHash = hashPassword("demo123456");

  const merchant = await prisma.user.upsert({
    where: { username: DEMO_MERCHANT.username },
    update: {
      nickname: DEMO_MERCHANT.nickname,
      merchantName: DEMO_MERCHANT.merchantName,
      role: "B",
      passwordHash,
    },
    create: {
      username: DEMO_MERCHANT.username,
      nickname: DEMO_MERCHANT.nickname,
      merchantName: DEMO_MERCHANT.merchantName,
      passwordHash,
      role: "B",
    },
    select: { id: true },
  });

  const buyerIds: string[] = [];
  for (const buyer of DEMO_BUYERS) {
    const user = await prisma.user.upsert({
      where: { username: buyer.username },
      update: { nickname: buyer.nickname, passwordHash },
      create: { username: buyer.username, nickname: buyer.nickname, passwordHash, role: "C" },
      select: { id: true },
    });
    buyerIds.push(user.id);
  }

  for (const product of DEMO_PRODUCTS) {
    const { id, ...rest } = product;
    await prisma.product.upsert({
      where: { id },
      update: { ...rest, merchantId: merchant.id, status: "PUBLISHED" },
      create: { id, ...rest, merchantId: merchant.id, status: "PUBLISHED" },
    });
  }

  for (const work of DEMO_WORKS) {
    const { id, ...rest } = work;
    await prisma.studioWork.upsert({
      where: { id },
      update: { ...rest, merchantId: merchant.id },
      create: { id, ...rest, merchantId: merchant.id },
    });
  }

  for (const klass of DEMO_CLASSES) {
    const { id, ...rest } = klass;
    await prisma.experienceClass.upsert({
      where: { id },
      update: { ...rest, merchantId: merchant.id, status: "PUBLISHED" },
      create: { id, ...rest, merchantId: merchant.id, status: "PUBLISHED" },
    });
  }

  const priceOf = new Map(DEMO_PRODUCTS.map((item) => [item.id, item.price]));

  for (const order of DEMO_ORDERS) {
    const productPrice = priceOf.get(order.productId) ?? 0;
    const createdAt = dateDaysAgo(order.daysAgo);
    const paid = order.status === "PAID" || order.status === "VERIFIED";
    const data = {
      orderNo: `ZYDEMO${String(order.seq).padStart(4, "0")}`,
      productId: order.productId,
      merchantId: merchant.id,
      buyerId: buyerIds[order.buyer],
      quantity: order.quantity,
      amount: productPrice * order.quantity,
      status: order.status,
      verifyCode: `9000${String(order.seq).padStart(2, "0")}`,
      paidAt: paid ? createdAt : null,
      verifiedAt: order.status === "VERIFIED" ? createdAt : null,
      createdAt,
    };
    await prisma.order.upsert({
      where: { id: `order-demo-${order.seq}` },
      update: data,
      create: { id: `order-demo-${order.seq}`, ...data },
    });
  }

  for (const enrollment of DEMO_ENROLLMENTS) {
    const { id, buyer, daysAgo, ...rest } = enrollment;
    const data = {
      ...rest,
      userId: buyerIds[buyer],
      createdAt: dateDaysAgo(daysAgo),
    };
    await prisma.classEnrollment.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    });
  }

  console.log(
    "已写入商户演示数据：1 个商户、5 件商品、3 件作品、2 门体验课、10 笔订单、3 条报名",
  );
  console.log(
    "商户账号 demo_merchant / demo123456；游客账号 demo_buyer_chen / demo123456",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
