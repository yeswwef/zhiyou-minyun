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

  if (process.env.SEED_DEMO_COMMUNITY === "true") {
    await seedEmergencyDemo();
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

/** 追加的社区内容：让演示数据更像真实运营状态，而不是只有几条空壳。 */
const extraPosts = [
  {
    id: "demo-community-guling-summer",
    author: "demo_shanhai",
    resourceSlug: "guling",
    type: "CHECKIN" as const,
    title: "鼓岭避暑半日：云海、老别墅和一杯茉莉花茶",
    content: "下午三点从鼓山坐车上来，先在柳杉王公园走了一圈，风比山下凉快不少。老别墅群很适合慢慢逛，傍晚在观景台看到了云海。山上茶摊的茉莉花茶不贵，坐着发呆很舒服。",
    rating: null,
    daysAgo: 2,
    recommendationWeight: 92,
  },
  {
    id: "demo-community-chuanzheng-review",
    author: "demo_arong",
    resourceSlug: "chuanzheng",
    type: "REVIEW" as const,
    title: "船政文化城比想象中好逛，建议留半天",
    content: "原以为只是几栋老房子，结果船政学堂、绘事院和马尾造船厂旧址都值得细看。展板做得认真，能串起近代海军那段历史。园区比较大，穿舒服的鞋，下午四点后光线最好。",
    rating: 5,
    daysAgo: 6,
    recommendationWeight: 89,
  },
  {
    id: "demo-community-jasmine-workshop",
    author: "demo_xiaoman",
    resourceSlug: "moli",
    type: "CHECKIN" as const,
    title: "在茶庄看了一下午窨制，才懂花香从哪来",
    content: "师傅把茶坯和新鲜茉莉一层层拌在一起，晚上还要筛花、复烘，来回好几次。整个院子都是花香，衣服上沾了一天味道。买了两小罐当伴手礼，比景区包装实在。",
    rating: null,
    daysAgo: 9,
    recommendationWeight: 86,
  },
  {
    id: "demo-community-tuotaiqi-review",
    author: "demo_shiyu",
    resourceSlug: "tuotaiqi",
    type: "REVIEW" as const,
    title: "脱胎漆器：一层层刷出来的光",
    content: "看师傅给漆胚上最后一道推光，才知道一件小碗要刷几十道漆、阴干好几个月。展厅里那只朱红大盘颜色很沉，和照片完全不一样。现场有小件可以买，价格从几十到几百。",
    rating: 5,
    daysAgo: 12,
    recommendationWeight: 84,
  },
  {
    id: "demo-community-fishball-zaoshi",
    author: "demo_lin",
    resourceSlug: "fuzhou-fishball",
    type: "REVIEW" as const,
    title: "鱼丸还是要吃现煮的",
    content: "在南后街附近的小店点了一碗，汤是清的，撒了点葱花和胡椒。鱼丸咬开会爆汁，皮比超市速冻的弹很多。一碗十二块，当早餐刚好，中午去就要排队了。",
    rating: 4,
    daysAgo: 7,
    recommendationWeight: 83,
  },
  {
    id: "demo-community-yantaishan-evening",
    author: "demo_arong",
    resourceSlug: "yantaishan",
    type: "CHECKIN" as const,
    title: "烟台山傍晚散步：从乐群楼走到江边",
    content: "五点从亭下路上去，沿路都是老洋房和梧桐。乐群楼平台能看到中洲岛和闽江，风一吹很舒服。下山后去仓前九里吃了碗芋泥，全程慢慢走大约两小时。",
    rating: null,
    daysAgo: 4,
    recommendationWeight: 91,
  },
  {
    id: "demo-community-xichansi-visit",
    author: "demo_shiyu",
    resourceSlug: "xichansi",
    type: "CHECKIN" as const,
    title: "西禅寺的荔枝树和报恩塔",
    content: "寺里比外面安静很多，五百罗汉堂可以慢慢看。报恩塔在树后面，换个角度才拍得到全貌。夏天荔枝熟的时候据说会分给香客，这次没赶上，下次再来。",
    rating: null,
    daysAgo: 10,
    recommendationWeight: 82,
  },
  {
    id: "demo-community-guobianhu-breakfast",
    author: "demo_xiaoman",
    resourceSlug: "guobianhu",
    type: "REVIEW" as const,
    title: "锅边糊是福州人的早餐记忆",
    content: "米浆沿着热锅边淋一圈，铲下来就是薄薄的米片，再下海鲜和芹菜。汤头很鲜，配一根油条刚好。店里都是附近居民，七点半以后位置就紧张了。",
    rating: 5,
    daysAgo: 14,
    recommendationWeight: 81,
  },
] as const;

/** 评论、点赞、收藏、关注、浏览与行程，统一在 seedCommunityActivity 中幂等写入。 */
const extraComments = [
  { id: "demo-cmt-01", postId: "demo-community-sanfang-checkin", author: "demo_arong", content: "南后街晚上人有点多，建议早上九点前去，巷子里会安静很多。", daysAgo: 2 },
  { id: "demo-cmt-02", postId: "demo-community-sanfang-checkin", author: "demo_shiyu", content: "林则徐纪念馆需要提前预约吗？周末想带爸妈去。", daysAgo: 1 },
  { id: "demo-cmt-03", postId: "demo-community-jasmine-review", author: "demo_xiaoman", content: "请问是哪家茶庄呀，想买一点带回家。", daysAgo: 4 },
  { id: "demo-cmt-04", postId: "demo-community-jasmine-review", author: "demo_lin", content: "茉莉花茶冷泡也很好喝，前一晚放冰箱，第二天带出门。", daysAgo: 3 },
  { id: "demo-cmt-05", postId: "demo-community-fishball-review", author: "demo_shanhai", content: "看着就饿了，这周找一天去吃。", daysAgo: 3 },
  { id: "demo-cmt-06", postId: "demo-community-fishball-review", author: "demo_arong", content: "老药洲街那几家也不错，汤头更浓一点。", daysAgo: 2 },
  { id: "demo-cmt-07", postId: "demo-community-gushan-checkin", author: "demo_lin", content: "上次去雾太大，什么都没看到，还是得挑晴天。", daysAgo: 5 },
  { id: "demo-cmt-08", postId: "demo-community-shoushan-review", author: "demo_xiaoman", content: "寿山石的颜色真的很特别，现场看比照片好看。", daysAgo: 6 },
  { id: "demo-cmt-09", postId: "demo-community-guling-summer", author: "demo_lin", content: "鼓岭的晚风确实舒服，山上停车方便吗？", daysAgo: 1 },
  { id: "demo-cmt-10", postId: "demo-community-guling-summer", author: "demo_arong", content: "柳杉王公园旁边有停车场，周末早点上去还有位置。", daysAgo: 1 },
  { id: "demo-cmt-11", postId: "demo-community-chuanzheng-review", author: "demo_shiyu", content: "船政学堂那部分值得细看，展板信息量很大。", daysAgo: 5 },
  { id: "demo-cmt-12", postId: "demo-community-chuanzheng-review", author: "demo_xiaoman", content: "带孩子去合适吗？小学生会不会觉得枯燥。", daysAgo: 4 },
  { id: "demo-cmt-13", postId: "demo-community-jasmine-workshop", author: "demo_shanhai", content: "窨制要反复好几次，真是长知识了。", daysAgo: 8 },
  { id: "demo-cmt-14", postId: "demo-community-jasmine-workshop", author: "demo_lin", content: "想问下体验需要提前多久预约？", daysAgo: 7 },
  { id: "demo-cmt-15", postId: "demo-community-tuotaiqi-review", author: "demo_arong", content: "漆器保养是不是很麻烦，怕磕碰。", daysAgo: 10 },
  { id: "demo-cmt-16", postId: "demo-community-tuotaiqi-review", author: "demo_lin", content: "现场看更震撼，那个朱红大盘照片拍不出质感。", daysAgo: 9 },
  { id: "demo-cmt-17", postId: "demo-community-fishball-zaoshi", author: "demo_xiaoman", content: "同意，现煮的和速冻的完全两个口感。", daysAgo: 6 },
  { id: "demo-cmt-18", postId: "demo-community-fishball-zaoshi", author: "demo_shanhai", content: "十二块一碗很实在，下次去试试。", daysAgo: 6 },
  { id: "demo-cmt-19", postId: "demo-community-yantaishan-evening", author: "demo_lin", content: "乐群楼那边拍照确实好看，傍晚光线柔和。", daysAgo: 3 },
  { id: "demo-cmt-20", postId: "demo-community-yantaishan-evening", author: "demo_shiyu", content: "江边风大，记得带件外套。", daysAgo: 2 },
  { id: "demo-cmt-21", postId: "demo-community-xichansi-visit", author: "demo_arong", content: "荔枝熟的时候去最有味道，寺里会分给香客。", daysAgo: 9 },
  { id: "demo-cmt-22", postId: "demo-community-xichansi-visit", author: "demo_xiaoman", content: "寺里很安静，适合待一个下午。", daysAgo: 8 },
  { id: "demo-cmt-23", postId: "demo-community-guobianhu-breakfast", author: "demo_lin", content: "配油条是灵魂，再来一点虾油更香。", daysAgo: 13 },
  { id: "demo-cmt-24", postId: "demo-community-guobianhu-breakfast", author: "demo_shanhai", content: "哪家汤头更浓？想找一家本地人多的。", daysAgo: 12 },
  { id: "demo-cmt-25", postId: "demo-community-sanfang-checkin", author: "demo_xiaoman", content: "早上八点半到，巷子里几乎没人，拍白墙特别干净。", daysAgo: 1 },
  { id: "demo-cmt-26", postId: "demo-community-gushan-checkin", author: "demo_shiyu", content: "索道排队久吗？想带爸妈去，不想爬太多台阶。", daysAgo: 4 },
  { id: "demo-cmt-27", postId: "demo-community-guling-summer", author: "demo_xiaoman", content: "山上的民宿晚上会不会很潮？需要带除湿袋吗？", daysAgo: 2 },
  { id: "demo-cmt-28", postId: "demo-community-chuanzheng-review", author: "demo_arong", content: "园区里有吃饭的地方吗，还是建议回市区再吃？", daysAgo: 3 },
  { id: "demo-cmt-29", postId: "demo-community-jasmine-workshop", author: "demo_shiyu", content: "体验课大概多久？想安排在下午回程前。", daysAgo: 6 },
  { id: "demo-cmt-30", postId: "demo-community-tuotaiqi-review", author: "demo_xiaoman", content: "漆器杯子能装热水吗？日常用会不会很娇气。", daysAgo: 5 },
  { id: "demo-cmt-31", postId: "demo-community-fishball-zaoshi", author: "demo_lin", content: "老药洲街哪家汤头最清？不太喜欢太重的胡椒味。", daysAgo: 4 },
  { id: "demo-cmt-32", postId: "demo-community-yantaishan-evening", author: "demo_arong", content: "乐群楼现在能上去吗？上次去好像在修。", daysAgo: 2 },
  { id: "demo-cmt-33", postId: "demo-community-xichansi-visit", author: "demo_shanhai", content: "五百罗汉堂可以拍照吗？带长焦会不会不方便。", daysAgo: 7 },
  { id: "demo-cmt-34", postId: "demo-community-guobianhu-breakfast", author: "demo_shiyu", content: "锅边糊配虾酥还是油条？想一次把两种都试了。", daysAgo: 10 },
  { id: "demo-cmt-35", postId: "demo-community-jasmine-review", author: "demo_shanhai", content: "冷泡大概放多少茶叶？想做成夏天常喝的浓度。", daysAgo: 2 },
  { id: "demo-cmt-36", postId: "demo-community-shoushan-review", author: "demo_lin", content: "寿山石文化城周末开门吗？想先去逛逛再决定买不买。", daysAgo: 3 },
] as const;

const extraLikes: Record<string, string[]> = {
  "demo-community-sanfang-checkin": ["demo_arong", "demo_xiaoman", "demo_shanhai", "demo_shiyu"],
  "demo-community-jasmine-review": ["demo_lin", "demo_xiaoman", "demo_shanhai"],
  "demo-community-fishball-review": ["demo_lin", "demo_arong", "demo_shiyu"],
  "demo-community-gushan-checkin": ["demo_lin", "demo_arong"],
  "demo-community-shoushan-review": ["demo_lin", "demo_arong", "demo_xiaoman"],
  "demo-community-guling-summer": ["demo_lin", "demo_arong", "demo_xiaoman", "demo_shiyu"],
  "demo-community-chuanzheng-review": ["demo_lin", "demo_shanhai", "demo_shiyu"],
  "demo-community-jasmine-workshop": ["demo_lin", "demo_arong", "demo_shanhai"],
  "demo-community-tuotaiqi-review": ["demo_lin", "demo_arong", "demo_xiaoman"],
  "demo-community-fishball-zaoshi": ["demo_arong", "demo_xiaoman", "demo_shanhai"],
  "demo-community-yantaishan-evening": ["demo_lin", "demo_xiaoman", "demo_shiyu"],
  "demo-community-xichansi-visit": ["demo_lin", "demo_arong"],
  "demo-community-guobianhu-breakfast": ["demo_lin", "demo_arong", "demo_shiyu"],
};

const extraFavorites: Record<string, string[]> = {
  "demo-community-sanfang-checkin": ["demo_arong", "demo_xiaoman"],
  "demo-community-jasmine-review": ["demo_lin", "demo_shanhai"],
  "demo-community-fishball-review": ["demo_lin", "demo_shiyu"],
  "demo-community-gushan-checkin": ["demo_arong", "demo_xiaoman", "demo_shiyu"],
  "demo-community-shoushan-review": ["demo_lin", "demo_shanhai"],
  "demo-community-guling-summer": ["demo_lin", "demo_xiaoman", "demo_arong"],
  "demo-community-chuanzheng-review": ["demo_lin", "demo_xiaoman"],
  "demo-community-jasmine-workshop": ["demo_lin", "demo_shanhai"],
  "demo-community-tuotaiqi-review": ["demo_arong", "demo_xiaoman"],
  "demo-community-fishball-zaoshi": ["demo_lin", "demo_shiyu"],
  "demo-community-yantaishan-evening": ["demo_xiaoman", "demo_lin", "demo_shiyu"],
  "demo-community-xichansi-visit": ["demo_arong", "demo_xiaoman"],
  "demo-community-guobianhu-breakfast": ["demo_lin", "demo_shanhai"],
};

/** 资源收藏：让个人中心的“我的收藏”不只有社区内容，也有景点与非遗。 */
const extraResourceFavorites = [
  { username: "demo_lin", slugs: ["sanfangqixiang", "gushan", "guling", "fuzhou-fishball"] },
  { username: "demo_arong", slugs: ["yantaishan", "chuanzheng", "tuotaiqi", "moli"] },
  { username: "demo_xiaoman", slugs: ["xichansi", "yuni", "moli", "shoushan"] },
  { username: "demo_shanhai", slugs: ["sanfangqixiang", "shangxiahang", "jinshansi", "lizhirou"] },
  { username: "demo_shiyu", slugs: ["moyan", "ruanmuhua", "minju", "pinghua"] },
] as const;

const extraFollows = [
  { follower: "demo_lin", following: "demo_arong" },
  { follower: "demo_lin", following: "demo_xiaoman" },
  { follower: "demo_lin", following: "demo_shanhai" },
  { follower: "demo_lin", following: "demo_shiyu" },
  { follower: "demo_arong", following: "demo_lin" },
  { follower: "demo_arong", following: "demo_xiaoman" },
  { follower: "demo_arong", following: "demo_shanhai" },
  { follower: "demo_xiaoman", following: "demo_lin" },
  { follower: "demo_xiaoman", following: "demo_arong" },
  { follower: "demo_xiaoman", following: "demo_shiyu" },
  { follower: "demo_shanhai", following: "demo_lin" },
  { follower: "demo_shanhai", following: "demo_arong" },
  { follower: "demo_shanhai", following: "demo_xiaoman" },
  { follower: "demo_shiyu", following: "demo_arong" },
  { follower: "demo_shiyu", following: "demo_lin" },
  { follower: "demo_shiyu", following: "demo_xiaoman" },
] as const;

const extraViews = [
  { username: "demo_lin", slugs: ["sanfangqixiang", "gushan", "yantaishan", "fuzhou-fishball", "moli", "guling"] },
  { username: "demo_arong", slugs: ["chuanzheng", "yantaishan", "shangxiahang", "tuotaiqi", "guobianhu"] },
  { username: "demo_xiaoman", slugs: ["moli", "xichansi", "gushan", "yuni"] },
  { username: "demo_shanhai", slugs: ["sanfangqixiang", "guling", "chuanzheng", "moli", "shoushan"] },
  { username: "demo_shiyu", slugs: ["tuotaiqi", "ruanmuhua", "minju", "xichansi", "yuni"] },
] as const;

const extraTrips = [
  {
    id: "demo-trip-lin-weekend",
    username: "demo_lin",
    title: "福州周末两日：坊巷 + 烟台山",
    durationDays: 2,
    daysAgo: 5,
    items: [
      { slug: "sanfangqixiang", title: "第1天 三坊七巷", day: 1 },
      { slug: "shangxiahang", title: "第1天 上下杭", day: 1 },
      { slug: "yantaishan", title: "第2天 烟台山", day: 2 },
      { slug: "fuzhou-fishball", title: "第2天 鱼丸早餐", day: 2 },
    ],
  },
  {
    id: "demo-trip-lin-guling",
    username: "demo_lin",
    title: "鼓山鼓岭一日避暑",
    durationDays: 1,
    daysAgo: 12,
    items: [
      { slug: "gushan", title: "第1天 鼓山", day: 1 },
      { slug: "guling", title: "第1天 鼓岭", day: 1 },
    ],
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
  await seedCommunityActivity(authorIds);
}

/**
 * 追加社区“活跃度”数据：更多游记、评论、点赞、收藏、关注、浏览与行程。
 * 使用固定 id 与 skipDuplicates，重复执行不会产生重复记录。
 */
async function seedCommunityActivity(authorIds: Map<string, string>) {
  for (const post of extraPosts) {
    const resource = await prisma.resource.findUniqueOrThrow({
      where: { slug: post.resourceSlug },
      select: { id: true, image: true },
    });
    const userId = authorIds.get(post.author);
    if (!userId) continue;
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
    const images = resource.image ? [{ imageUrl: resource.image, sortOrder: 0 }] : [];
    await prisma.communityPost.upsert({
      where: { id: post.id },
      update: { ...data, images: { deleteMany: {}, create: images } },
      create: { id: post.id, ...data, images: { create: images } },
    });
  }

  for (const comment of extraComments) {
    const userId = authorIds.get(comment.author);
    if (!userId) continue;
    const createdAt = dateDaysAgo(comment.daysAgo);
    await prisma.communityComment.upsert({
      where: { id: comment.id },
      update: { content: comment.content, createdAt },
      create: { id: comment.id, userId, postId: comment.postId, content: comment.content, createdAt },
    });
  }

  // 点赞：先清掉演示帖的旧点赞再按固定规则重建，保证重复执行后数量和分布稳定。
  const demoPostIds = [...demoPosts, ...extraPosts].map((post) => post.id);
  const likeRows = Object.entries(extraLikes).flatMap(([postId, users], postIndex) =>
    users
      .map((username, userIndex) => ({
        userId: authorIds.get(username) ?? "",
        postId,
        // 点赞时间错开，避免所有互动都堆在同一秒。
        createdAt: dateDaysAgo(1 + ((postIndex + userIndex) % 9)),
      }))
      .filter((row) => row.userId));
  await prisma.communityPostLike.deleteMany({ where: { postId: { in: demoPostIds } } });
  if (likeRows.length) await prisma.communityPostLike.createMany({ data: likeRows, skipDuplicates: true });

  const favoriteRows = Object.entries(extraFavorites).flatMap(([postId, users]) =>
    users
      .map((username) => ({ userId: authorIds.get(username) ?? "", postId, createdAt: dateDaysAgo(3) }))
      .filter((row) => row.userId));
  if (favoriteRows.length) await prisma.communityPostFavorite.createMany({ data: favoriteRows, skipDuplicates: true });

  const followRows = extraFollows
    .map((item) => ({
      followerId: authorIds.get(item.follower) ?? "",
      followingId: authorIds.get(item.following) ?? "",
    }))
    .filter((row) => row.followerId && row.followingId);
  if (followRows.length) await prisma.userFollow.createMany({ data: followRows, skipDuplicates: true });

  const viewedSlugs = [...new Set(extraViews.flatMap((item) => item.slugs))];
  const favoriteSlugs = [...new Set(extraResourceFavorites.flatMap((item) => item.slugs))];
  const neededSlugs = [...new Set([...viewedSlugs, ...favoriteSlugs])];
  const resources = await prisma.resource.findMany({
    where: { slug: { in: neededSlugs } },
    select: { id: true, slug: true },
  });
  const resourceIdBySlug = new Map(resources.map((item) => [item.slug, item.id]));
  const viewRows = extraViews.flatMap((item) => {
    const userId = authorIds.get(item.username);
    if (!userId) return [];
    return item.slugs
      .map((slug, index) => ({ userId, resourceId: resourceIdBySlug.get(slug) ?? "", viewedAt: dateDaysAgo(index + 1) }))
      .filter((row) => row.resourceId);
  });
  if (viewRows.length) await prisma.resourceView.createMany({ data: viewRows, skipDuplicates: true });

  // 资源收藏与社区内容收藏分开写入，个人中心的“我的收藏”会同时出现两类内容。
  const resourceFavoriteRows = extraResourceFavorites.flatMap((item, userIndex) => {
    const userId = authorIds.get(item.username);
    if (!userId) return [];
    return item.slugs
      .map((slug, index) => ({ userId, resourceId: resourceIdBySlug.get(slug) ?? "", createdAt: dateDaysAgo(2 + ((userIndex + index) % 6)) }))
      .filter((row) => row.resourceId);
  });
  if (resourceFavoriteRows.length) await prisma.favorite.createMany({ data: resourceFavoriteRows, skipDuplicates: true });

  for (const trip of extraTrips) {
    const userId = authorIds.get(trip.username);
    if (!userId) continue;
    const items = trip.items
      .map((item) => ({
        // 资源详情路由按 slug 访问，这里存 slug 而不是数据库 id。
        resourceId: item.slug,
        title: item.title,
        day: item.day,
      }));
    const createdAt = dateDaysAgo(trip.daysAgo);
    await prisma.trip.upsert({
      where: { id: trip.id },
      update: { title: trip.title, durationDays: trip.durationDays, items },
      create: {
        id: trip.id,
        userId,
        title: trip.title,
        durationDays: trip.durationDays,
        items,
        createdAt,
        updatedAt: createdAt,
      },
    });
  }

  console.log(
    `已补充社区活跃数据：${extraPosts.length} 篇游记、${extraComments.length} 条评论；` +
    `点赞共 ${likeRows.length} 次（分布在 ${demoPostIds.length} 篇内容上，单篇最多 4 个，由 5 个演示账号分别点赞）、` +
    `社区收藏 ${favoriteRows.length} 次、资源收藏 ${resourceFavoriteRows.length} 条、关注 ${followRows.length} 个、浏览 ${viewRows.length} 条、行程 ${extraTrips.length} 个`,
  );
}

const DEMO_MERCHANT = {
  username: "demo_merchant",
  nickname: "三坊七巷文创店",
  merchantName: "福州三坊七巷文创店",
  merchantAddress: "福州市鼓楼区南后街 88 号",
  legalPerson: "林守艺",
  merchantPhone: "0591-87654321",
  creditCode: "91350102MA2Y8K3L6N",
  merchantIntro: "扎根三坊七巷的文创小店，做寿山石、脱胎漆器与软木画的当代设计，也提供手作体验与非遗课程。",
};

const DEMO_BUYERS = [
  { username: "demo_buyer_chen", nickname: "陈小雨" },
  { username: "demo_buyer_lin", nickname: "林海" },
  { username: "demo_buyer_su", nickname: "苏文" },
  { username: "demo_lin", nickname: "林同学" },
  { username: "demo_arong", nickname: "阿榕" },
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
  { seq: 11, productId: "product-guling-woodcabin", buyer: 0, quantity: 1, status: "PAID" as const, daysAgo: 0 },
  { seq: 12, productId: "product-shangxiahang-loft", buyer: 1, quantity: 1, status: "PAID" as const, daysAgo: 1 },
  { seq: 13, productId: "product-yuni-tea", buyer: 2, quantity: 2, status: "VERIFIED" as const, daysAgo: 1 },
  { seq: 14, productId: "product-minju-mask", buyer: 0, quantity: 2, status: "VERIFIED" as const, daysAgo: 2 },
  { seq: 15, productId: "product-jasmine-tin", buyer: 1, quantity: 3, status: "VERIFIED" as const, daysAgo: 2 },
  { seq: 16, productId: "product-chuanzheng-kids", buyer: 2, quantity: 2, status: "PENDING" as const, daysAgo: 0 },
  { seq: 17, productId: "product-tuotaiqi", buyer: 0, quantity: 1, status: "PAID" as const, daysAgo: 3 },
  { seq: 18, productId: "product-ruanmuhua", buyer: 1, quantity: 1, status: "VERIFIED" as const, daysAgo: 4 },
  { seq: 19, productId: "product-guobianhu", buyer: 2, quantity: 3, status: "VERIFIED" as const, daysAgo: 5 },
  { seq: 20, productId: "product-lizhirou", buyer: 0, quantity: 2, status: "VERIFIED" as const, daysAgo: 6 },
  { seq: 21, productId: "product-fotiaoqiang", buyer: 1, quantity: 1, status: "CANCELLED" as const, daysAgo: 4 },
  { seq: 22, productId: "product-xihu-apartment", buyer: 2, quantity: 1, status: "PAID" as const, daysAgo: 7 },
  { seq: 23, productId: "product-jasmine-study", buyer: 0, quantity: 2, status: "VERIFIED" as const, daysAgo: 8 },
  { seq: 24, productId: "product-shoushan-seal", buyer: 1, quantity: 2, status: "VERIFIED" as const, daysAgo: 9 },
  { seq: 25, productId: "product-yantaishan-stay", buyer: 2, quantity: 1, status: "PAID" as const, daysAgo: 8 },
  { seq: 26, productId: "product-rouyan", buyer: 0, quantity: 3, status: "VERIFIED" as const, daysAgo: 10 },
  { seq: 27, productId: "product-lizhirou", buyer: 1, quantity: 2, status: "PAID" as const, daysAgo: 9 },
  { seq: 28, productId: "product-tuotaiqi-cup", buyer: 2, quantity: 1, status: "PENDING" as const, daysAgo: 1 },
  { seq: 29, productId: "product-yuni-tea", buyer: 3, quantity: 2, status: "VERIFIED" as const, daysAgo: 1 },
  { seq: 30, productId: "product-jasmine-tin", buyer: 3, quantity: 1, status: "PAID" as const, daysAgo: 0 },
  { seq: 31, productId: "product-fishball", buyer: 4, quantity: 2, status: "VERIFIED" as const, daysAgo: 2 },
  { seq: 32, productId: "product-minju-mask", buyer: 4, quantity: 2, status: "PAID" as const, daysAgo: 1 },
  { seq: 33, productId: "product-ruanmuhua", buyer: 3, quantity: 1, status: "PENDING" as const, daysAgo: 0 },
  { seq: 34, productId: "product-tuotaiqi-cup", buyer: 4, quantity: 1, status: "VERIFIED" as const, daysAgo: 3 },
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
      merchantAddress: DEMO_MERCHANT.merchantAddress,
      legalPerson: DEMO_MERCHANT.legalPerson,
      merchantPhone: DEMO_MERCHANT.merchantPhone,
      creditCode: DEMO_MERCHANT.creditCode,
      merchantIntro: DEMO_MERCHANT.merchantIntro,
      role: "B",
      passwordHash,
    },
    create: {
      username: DEMO_MERCHANT.username,
      nickname: DEMO_MERCHANT.nickname,
      merchantName: DEMO_MERCHANT.merchantName,
      merchantAddress: DEMO_MERCHANT.merchantAddress,
      legalPerson: DEMO_MERCHANT.legalPerson,
      merchantPhone: DEMO_MERCHANT.merchantPhone,
      creditCode: DEMO_MERCHANT.creditCode,
      merchantIntro: DEMO_MERCHANT.merchantIntro,
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
    `已写入商户演示数据：1 个商户、${DEMO_PRODUCTS.length} 件商品、${DEMO_WORKS.length} 件作品、${DEMO_CLASSES.length} 门体验课、${DEMO_ORDERS.length} 笔订单、${DEMO_ENROLLMENTS.length} 条报名`,
  );
  console.log(
    "商户账号 demo_merchant / demo123456；游客账号 demo_buyer_chen / demo123456",
  );
}

/** 便民应急演示工单：让景点工作台的应急模块有可处置的真实数据。 */
async function seedEmergencyDemo() {
  const users = await prisma.user.findMany({
    where: { username: { in: ["demo_buyer_chen", "demo_buyer_lin", "demo_lin", "demo_arong", "demo_xiaoman", "demo_shanhai", "demo_shiyu"] } },
    select: { id: true, username: true },
  });
  const userIds = new Map(users.map((user) => [user.username, user.id]));
  const now = Date.now();
  const rows = [
    {
      id: "demo-emergency-medical",
      username: "demo_buyer_chen",
      kind: "MEDICAL",
      lat: 26.0819,
      lng: 119.2966,
      accuracy: 35,
      note: "同行老人疑似中暑，已到南后街口，需要就近医疗点。",
      phone: "13800001234",
      status: "pending",
      createdAt: new Date(now - 2 * 3600 * 1000),
      handledAt: null,
    },
    {
      id: "demo-emergency-lost",
      username: "demo_buyer_chen",
      kind: "LOST",
      lat: 26.0568,
      lng: 119.3049,
      accuracy: 60,
      note: "在上下杭与孩子走散，孩子穿黄色外套，请协助广播寻找。",
      phone: "13900002345",
      status: "pending",
      createdAt: new Date(now - 5 * 3600 * 1000),
      handledAt: null,
    },
    {
      id: "demo-emergency-trapped",
      username: "demo_buyer_chen",
      kind: "TRAPPED",
      lat: 26.0772,
      lng: 119.2987,
      accuracy: 25,
      note: "暴雨后巷内积水较深，同行者行动不便，需要协助转移。",
      phone: "13700003456",
      status: "handled",
      createdAt: new Date(now - 2 * 86400 * 1000),
      handledAt: new Date(now - 2 * 86400 * 1000 + 25 * 60 * 1000),
    },
    {
      id: "demo-emergency-other",
      username: "demo_buyer_chen",
      kind: "OTHER",
      lat: 26.0555,
      lng: 119.3918,
      accuracy: 80,
      note: "登山途中手机电量不足，询问下山路线与最近补给点。",
      phone: null,
      status: "closed",
      createdAt: new Date(now - 4 * 86400 * 1000),
      handledAt: new Date(now - 4 * 86400 * 1000 + 40 * 60 * 1000),
    },
    {
      id: "demo-emergency-fever",
      username: "demo_arong",
      kind: "MEDICAL",
      lat: 26.0439,
      lng: 119.3189,
      accuracy: 30,
      note: "孩子在烟台山乐群路附近发烧，体温 38.7℃，想找最近的药店或社区医院。",
      phone: "13600005678",
      status: "pending",
      createdAt: new Date(now - 40 * 60 * 1000),
      handledAt: null,
    },
    {
      id: "demo-emergency-wallet",
      username: "demo_xiaoman",
      kind: "OTHER",
      lat: 26.0806,
      lng: 119.2952,
      accuracy: 45,
      note: "在南后街主街丢失一只棕色钱包，内有身份证和学生证，已联系街区服务点。",
      phone: "13500006789",
      status: "handled",
      createdAt: new Date(now - 1 * 86400 * 1000),
      handledAt: new Date(now - 1 * 86400 * 1000 + 18 * 60 * 1000),
    },
    {
      id: "demo-emergency-guling",
      username: "demo_shanhai",
      kind: "TRAPPED",
      lat: 26.0865,
      lng: 119.3948,
      accuracy: 55,
      note: "鼓岭古道雨后湿滑，同行者扭伤脚踝无法下山，位置在柳杉王公园上方步道。",
      phone: "13700007890",
      status: "pending",
      createdAt: new Date(now - 3 * 3600 * 1000),
      handledAt: null,
    },
    {
      id: "demo-emergency-xichan",
      username: "demo_shiyu",
      kind: "MEDICAL",
      lat: 26.0705,
      lng: 119.2846,
      accuracy: 20,
      note: "在西禅寺内低血糖头晕，已坐下休息，需要一瓶含糖饮料或医务室指引。",
      phone: "13800008901",
      status: "handled",
      createdAt: new Date(now - 3 * 86400 * 1000),
      handledAt: new Date(now - 3 * 86400 * 1000 + 12 * 60 * 1000),
    },
    {
      id: "demo-emergency-yantai-lost",
      username: "demo_lin",
      kind: "LOST",
      lat: 26.0442,
      lng: 119.3168,
      accuracy: 70,
      note: "在烟台山亭下路与家中老人走散，老人穿深蓝色夹克、戴灰色帽子。",
      phone: "13900009012",
      status: "closed",
      createdAt: new Date(now - 5 * 86400 * 1000),
      handledAt: new Date(now - 5 * 86400 * 1000 + 35 * 60 * 1000),
    },
    {
      id: "demo-emergency-night-route",
      username: "demo_buyer_lin",
      kind: "OTHER",
      lat: 26.0578,
      lng: 119.3021,
      accuracy: 90,
      note: "晚上在上下杭找不到回地铁站的接驳点，想确认末班车时间和步行路线。",
      phone: null,
      status: "closed",
      createdAt: new Date(now - 6 * 86400 * 1000),
      handledAt: new Date(now - 6 * 86400 * 1000 + 9 * 60 * 1000),
    },
  ];

  for (const { username, ...row } of rows) {
    const userId = userIds.get(username) ?? null;
    await prisma.emergencyRequest.upsert({
      where: { id: row.id },
      update: { ...row, userId },
      create: { ...row, userId },
    });
  }
  console.log("已写入 10 条应急演示工单（4 条待处理 / 3 条已处理 / 3 条已关闭）");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
