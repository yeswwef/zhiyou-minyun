/**
 * @module-note prisma/seed.ts
 * 数据库初始化脚本：用于开发演示数据，运行会写入数据库，不能当作只读检查。
 */
import { prisma } from "../lib/db";
import { hashPassword } from "../lib/auth";
import { resources } from "./resources-data";
import {
  commerceClasses as DEMO_CLASSES,
  commerceProducts as DEMO_PRODUCTS,
  commerceWorks as DEMO_WORKS,
} from "./commerce-data";

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
