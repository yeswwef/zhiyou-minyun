/**
 * @module-note prisma/commerce-data.ts
 * 商城与非遗学习的演示数据：统一放在这里，seed 与本地联调脚本共用。
 * 金额单位为分；图片均为公开网络演示素材。
 */
import type { ProductCategoryValue } from "../features/merchant/types";

export type CommerceProductSeed = {
  id: string;
  category: ProductCategoryValue;
  title: string;
  summary: string;
  description: string;
  price: number;
  stock: number;
  unit: string;
  image: string;
  location: string;
};

export type CommerceWorkSeed = {
  id: string;
  title: string;
  description: string;
  image: string;
  sortOrder: number;
};

export type CommerceClassSeed = {
  id: string;
  title: string;
  summary: string;
  price: number;
  capacity: number;
  schedule: string;
  location: string;
  image: string;
};

export const commerceProducts: CommerceProductSeed[] = [
  {
    id: "product-homestay",
    category: "HOMESTAY",
    title: "坊巷古厝民宿 · 双人间",
    summary: "住在老坊巷里，推窗就是闽都烟火。",
    description:
      "由三坊七巷周边古厝改造，保留马鞍墙、木格窗与天井。房间含双早，步行 5 分钟到南后街，夜里可以慢慢逛回坊巷。",
    price: 39800,
    stock: 20,
    unit: "晚",
    image: "/images/resources/sanfangqixiang.jpg",
    location: "福州市鼓楼区南后街",
  },
  {
    id: "product-guling-stay",
    category: "HOMESTAY",
    title: "鼓岭山居 · 露台大床房",
    summary: "海拔 800 米，把榕城暑气留在山下。",
    description:
      "藏在鼓岭柳杉林里的山居，房间带观景露台，清晨看云海、傍晚看城市灯火。含双早与一次鼓岭老街导览。",
    price: 68800,
    stock: 12,
    unit: "晚",
    image: "/images/resources/gushan.jpg",
    location: "福州市晋安区鼓岭",
  },
  {
    id: "product-yantaishan-stay",
    category: "HOMESTAY",
    title: "烟台山江景公寓 · 一室一厅",
    summary: "推窗见闽江，下楼就是烟台山。",
    description:
      "位于烟台山历史风貌区边缘的独立公寓，一室一厅带厨房，适合两三人小住。步行可达乐群路、仓前路与江滨。",
    price: 45800,
    stock: 8,
    unit: "晚",
    image: "/images/resources/yantaishan.jpg",
    location: "福州市仓山区烟台山",
  },
  {
    id: "product-fishball",
    category: "DINING",
    title: "福州鱼丸双人套餐",
    summary: "手工打制的弹牙鱼丸，清汤见真味。",
    description:
      "现打鱼丸配清汤，另含拌面、烫青菜与茉莉花茶，两人份。鱼丸皮薄馅鲜，汤头清亮，是福州人最日常的一口。",
    price: 8800,
    stock: 200,
    unit: "份",
    image: "/images/resources/fuzhou-fishball.jpg",
    location: "福州市台江区上下杭",
  },
  {
    id: "product-fotiaoqiang",
    category: "DINING",
    title: "佛跳墙单人套餐",
    summary: "一坛山海，慢火煨足八小时。",
    description:
      "鲍鱼、海参、花胶、瑶柱、鸽蛋分层入坛，加高汤与绍兴酒文火煨制。套餐含开坛小菜、时蔬与甜品，建议提前一天预订。",
    price: 28800,
    stock: 60,
    unit: "份",
    image: "/images/resources/fotiaoqiang.jpg",
    location: "福州市鼓楼区聚春园",
  },
  {
    id: "product-lizhirou",
    category: "DINING",
    title: "荔枝肉 · 芋泥双人餐",
    summary: "酸甜荔枝肉，配一盅绵密芋泥。",
    description:
      "经典闽菜荔枝肉，外酥里嫩、酸甜开胃；搭配福州芋泥与一壶茉莉花茶。双人份，适合逛完三坊七巷后来吃。",
    price: 12800,
    stock: 80,
    unit: "份",
    image: "/images/resources/lizhirou.jpg",
    location: "福州市鼓楼区东街口",
  },
  {
    id: "product-guobianhu",
    category: "DINING",
    title: "锅边糊早餐套餐",
    summary: "一口鼎边糊，唤醒福州的清晨。",
    description:
      "米浆沿热锅边烫成薄片，铲入虾油高汤，配海蛎、虾米与葱花。套餐另含油条一根与豆浆，供应到上午十点半。",
    price: 2800,
    stock: 150,
    unit: "份",
    image: "/images/resources/guobianhu.jpg",
    location: "福州市台江区上下杭",
  },
  {
    id: "product-shoushan",
    category: "HANDICRAFT",
    title: "寿山石雕小摆件 · 福",
    summary: "传承人手工雕刻，一方石头一只福。",
    description:
      "以寿山石为材，因材施艺雕刻「福」字小摆件，附作品证书与锦盒，可作桌面陈设或伴手礼。每件纹理略有不同。",
    price: 26800,
    stock: 30,
    unit: "件",
    image: "/images/resources/shoushan.jpg",
    location: "福州市晋安区寿山乡",
  },
  {
    id: "product-tuotaiqi",
    category: "HANDICRAFT",
    title: "脱胎漆器茶则",
    summary: "轻若浮云，色如深漆。",
    description:
      "以福州脱胎漆器髹饰技艺制作，胎体轻、漆面润，适合取茶则使用。每只经数十道髹涂与打磨，附作者落款。",
    price: 39800,
    stock: 18,
    unit: "件",
    image: "/images/resources/tuotaiqi.jpg",
    location: "福州市鼓楼区三坊七巷",
  },
  {
    id: "product-ruanmuhua",
    category: "HANDICRAFT",
    title: "软木画小夜灯",
    summary: "把三山两塔，收进一盏暖光里。",
    description:
      "以软木薄片雕刻、拼贴出福州山水与古厝，内置暖光 LED。既是案头小灯，也是一幅立体的福州风景。",
    price: 32800,
    stock: 24,
    unit: "件",
    image: "/images/resources/ruanmuhua.jpg",
    location: "福州市鼓楼区南后街",
  },
  {
    id: "product-jasmine-tea",
    category: "SOUVENIR",
    title: "三坊七巷茉莉花茶礼盒",
    summary: "把福州的夏天装进礼盒，花香清雅。",
    description:
      "选用福州传统窨制工艺茉莉花茶，花香入茶、回味甘甜。礼盒含两罐茶叶与一只白瓷杯，适合送礼或带回家慢慢喝。",
    price: 6800,
    stock: 120,
    unit: "盒",
    image: "/images/resources/molihua.jpg",
    location: "福州市鼓楼区南后街",
  },
  {
    id: "product-shoushan-seal",
    category: "SOUVENIR",
    title: "寿山石印章礼盒",
    summary: "一方小印，刻下自己的名字。",
    description:
      "寿山石素章配印泥与锦盒，可自选字体刻名。石料温润，适合作为毕业礼、生日礼或福州之行的纪念。",
    price: 16800,
    stock: 40,
    unit: "盒",
    image: "/images/resources/shoushan.jpg",
    location: "福州市晋安区寿山乡",
  },
  {
    id: "product-rouyan",
    category: "SOUVENIR",
    title: "福州肉燕伴手礼盒",
    summary: "薄如纸的燕皮，包住一口鲜。",
    description:
      "手工捶打肉燕皮，包入鲜肉馅，附高汤料包。冷冻礼盒可保存 30 天，回家煮五分钟就是一碗福州味道。",
    price: 8800,
    stock: 90,
    unit: "盒",
    image: "/images/resources/rouyan.jpg",
    location: "福州市台江区上下杭",
  },
  {
    id: "product-study-tour",
    category: "STUDYTOUR",
    title: "三坊七巷研学半日营",
    summary: "跟着讲解走坊巷，读懂半部闽都史。",
    description:
      "半日研学路线，含专业讲解、非遗手作体验与研学手册。从南后街走到林觉民故居，适合亲子与学生团队。",
    price: 12800,
    stock: 60,
    unit: "人",
    image: "/images/resources/sanfangqixiang.jpg",
    location: "福州市鼓楼区三坊七巷",
  },
  {
    id: "product-shoushan-study",
    category: "STUDYTOUR",
    title: "寿山石雕刻研学一日营",
    summary: "上午认石，下午刻一方自己的印。",
    description:
      "从寿山石矿脉、石种辨识讲到雕刻入门，下午在传承人指导下完成一枚小印章。含午餐、材料与工具，作品可带走。",
    price: 26800,
    stock: 30,
    unit: "人",
    image: "/images/resources/shoushan.jpg",
    location: "福州市晋安区寿山乡",
  },
  {
    id: "product-chuanzheng-study",
    category: "STUDYTOUR",
    title: "船政文化研学半日营",
    summary: "在马尾，读中国近代海军的第一页。",
    description:
      "参观船政文化博物馆与船政格致园，了解福州船政学堂、造船与海军历史。含讲解、研学任务卡与手作船模。",
    price: 19800,
    stock: 45,
    unit: "人",
    image: "/images/resources/chuanzheng.jpg",
    location: "福州市马尾区船政文化城",
  },
  {
    id: "product-xihu-apartment",
    category: "HOMESTAY",
    title: "西湖畔城市公寓 · 一室一厅",
    summary: "推窗见湖，步行十分钟到三坊七巷。",
    description:
      "位于西湖公园东侧的老小区改造公寓，一室一厅带厨房和洗衣机，适合住两晚以上的自由行。楼下有早餐店和便利店，去西湖、左海公园都是步行距离。",
    price: 32800,
    stock: 12,
    unit: "晚",
    image: "/images/resources/xihu.jpg",
    location: "福州市鼓楼区湖滨路",
  },
  {
    id: "product-ruanmuhua-bookmark",
    category: "HANDICRAFT",
    title: "软木画书签套装 · 三山两塔",
    summary: "把乌山、于山、屏山收进一枚书签。",
    description:
      "以软木薄片手工拼贴的福州地标书签，一套三枚，分别是最佳拍照角度的乌塔、白塔和镇海楼。附赠小木盒，适合送喜欢读书的朋友。",
    price: 9800,
    stock: 40,
    unit: "套",
    image: "/images/resources/ruanmuhua.jpg",
    location: "福州市鼓楼区南后街",
  },
  {
    id: "product-tuotaiqi-cup",
    category: "HANDICRAFT",
    title: "脱胎漆器主人杯 · 朱砂红",
    summary: "一层层推光出来的温润手感。",
    description:
      "手工髹漆的小口主人杯，朱砂红配色，杯壁轻、握感温润。每只纹理略有差异，适合日常喝茶，也可作为书房摆件。",
    price: 22800,
    stock: 18,
    unit: "只",
    image: "/images/resources/tuotaiqi.jpg",
    location: "福州市鼓楼区三坊七巷",
  },
  {
    id: "product-jasmine-sachet",
    category: "SOUVENIR",
    title: "茉莉花茶香囊礼盒",
    summary: "把福州的夏天装进一只小香囊。",
    description:
      "用窨制过的茉莉干花填充，香气清甜不冲。两只装礼盒，可放衣柜、车内或书桌，香气淡了揉一揉还能再持续一段时间。",
    price: 5800,
    stock: 60,
    unit: "盒",
    image: "/images/resources/molihua.jpg",
    location: "福州市仓山区城门镇",
  },
  {
    id: "product-fishball-rouyan-box",
    category: "SOUVENIR",
    title: "鱼丸肉燕双拼礼盒",
    summary: "带一份福州味道回家煮。",
    description:
      "手工鱼丸与肉燕各一袋，附一份清汤配料包，冷链发货。回家水开下锅三分钟就能吃，适合带给家人当早餐。",
    price: 12800,
    stock: 50,
    unit: "盒",
    image: "/images/resources/rouyan.jpg",
    location: "福州市台江区",
  },
  {
    id: "product-jasmine-study",
    category: "STUDYTOUR",
    title: "茉莉花茶窨制体验营",
    summary: "半天时间，从筛花到装罐全程上手。",
    description:
      "在仓山茶厂跟着师傅筛花、拌茶、复烘，了解窨制为什么要反复多次。结束后可带走自己参与窨制的一小罐茶，含茶点。",
    price: 16800,
    stock: 24,
    unit: "人",
    image: "/images/resources/molihua.jpg",
    location: "福州市仓山区城门镇",
  },
  {
    id: "product-guling-woodcabin",
    category: "HOMESTAY",
    title: "鼓岭木屋 · 森林双床房",
    summary: "住进柳杉林里，把夏夜交给虫鸣。",
    description:
      "木屋藏在鼓岭柳杉王公园附近的林子里，双床房带小露台，清晨能看到山雾从谷底升起来。含双早与一次鼓岭老街导览，适合想避开市区暑气的两日小住。山路弯多，建议白天上山。",
    price: 52800,
    stock: 8,
    unit: "晚",
    image: "/images/resources/guling.jpg",
    location: "福州市晋安区鼓岭",
  },
  {
    id: "product-shangxiahang-loft",
    category: "HOMESTAY",
    title: "上下杭河畔 LOFT · 一室一厅",
    summary: "推窗是三捷河，下楼就是老会馆。",
    description:
      "由上下杭老商行改造的 LOFT，一室一厅带简易厨房，步行可达星安桥、采峰别墅与苍霞。晚上游客散去后，河埠和骑楼会安静下来，适合喜欢老城夜色的住客。",
    price: 36800,
    stock: 10,
    unit: "晚",
    image: "/images/resources/shangxiahang.jpg",
    location: "福州市台江区上下杭",
  },
  {
    id: "product-yuni-tea",
    category: "DINING",
    title: "芋泥茉莉下午茶 · 双人",
    summary: "一盅热芋泥，一壶茉莉花茶。",
    description:
      "现蒸槟榔芋压成泥，配红枣与瓜子仁，另配一壶福州茉莉花茶和两样咸点。芋泥绵密偏甜，配茶刚好解腻。每天下午两点开始供应，建议提前预留靠窗位置。",
    price: 5800,
    stock: 60,
    unit: "份",
    image: "/images/resources/yuni.jpg",
    location: "福州市鼓楼区南后街",
  },
  {
    id: "product-minju-mask",
    category: "HANDICRAFT",
    title: "闽剧脸谱彩绘体验",
    summary: "画一张属于自己的闽剧脸谱。",
    description:
      "在老师指导下认识闽剧生旦净丑的脸谱用色，再从勾线、上色到定妆完成一张可带走的脸谱。含材料与围裙，适合亲子和朋友同行，全程约 90 分钟。",
    price: 12800,
    stock: 30,
    unit: "件",
    image: "/images/resources/minju.jpg",
    location: "福州市台江区上下杭",
  },
  {
    id: "product-jasmine-tin",
    category: "SOUVENIR",
    title: "茉莉花茶小罐礼盒",
    summary: "两小罐当季窨制，随身带着福州香气。",
    description:
      "选用当季茉莉多次窨制的绿茶，分装两只小铁罐，附手提纸袋。香气清雅，冷泡热泡都合适，适合作为轻便的福州伴手礼。",
    price: 8800,
    stock: 80,
    unit: "盒",
    image: "/images/resources/molihua.jpg",
    location: "福州市仓山区城门镇",
  },
  {
    id: "product-chuanzheng-kids",
    category: "STUDYTOUR",
    title: "船政小小航海家亲子半日营",
    summary: "看船厂、识船模，做一艘自己的小船。",
    description:
      "面向 6–12 岁亲子家庭，参观船政文化博物馆与船政格致园，用任务卡认识船政学堂、造船与近代海军，最后动手完成一艘小木船模型。含讲解、材料与保险。",
    price: 22800,
    stock: 40,
    unit: "人",
    image: "/images/resources/chuanzheng.jpg",
    location: "福州市马尾区船政文化城",
  },
];

export const commerceWorks: CommerceWorkSeed[] = [
  {
    id: "work-shoushan-carving",
    title: "寿山石雕《梅雀争春》",
    description:
      "顺着石材天然的色泽与纹理构思，以梅花与雀鸟为题。梅枝取俏色，雀鸟留白，是工作室的代表作品之一。",
    image: "/images/resources/shoushan.jpg",
    sortOrder: 1,
  },
  {
    id: "work-tuotaiqi-lacquer",
    title: "脱胎漆器《漆园》",
    description:
      "以脱胎技法成型，数十道髹漆、打磨、推光，漆面温润如镜。器型取福州园林的月洞门，光线走过时有一层深不见底的黑。",
    image: "/images/resources/tuotaiqi.jpg",
    sortOrder: 2,
  },
  {
    id: "work-ruanmuhua-landscape",
    title: "软木画《三山两塔》",
    description:
      "以软木薄片雕刻乌山、于山、屏山与白塔、乌塔，层层拼贴出福州老城的立体轮廓。远看是画，近看是微缩的山河。",
    image: "/images/resources/ruanmuhua.jpg",
    sortOrder: 3,
  },
  {
    id: "work-minju-mask",
    title: "闽剧脸谱彩绘",
    description:
      "以闽剧传统脸谱为底稿，用矿物颜料手绘。红表忠勇、黑表刚直、白表奸诈，一张脸就是一段戏文。",
    image: "/images/resources/minju.jpg",
    sortOrder: 4,
  },
  {
    id: "work-jasmine-tea-seat",
    title: "茉莉花茶手作茶席",
    description:
      "一套以茉莉花为主题的茶席，含手作茶巾、竹制茶则与两只白瓷杯。茶席以夏夜花香为线索，呈现福州人的慢生活。",
    image: "/images/resources/molihua.jpg",
    sortOrder: 5,
  },
  {
    id: "work-min-du-sachet",
    title: "闽都香囊手作",
    description:
      "以古厝纹样为灵感的手缝香囊，内填本地香草与茉莉干花。可作随身小物、衣柜香氛，也是福州人端午节的老习惯。",
    image: "/images/resources/shangxiahang.jpg",
    sortOrder: 6,
  },
];

export const commerceClasses: CommerceClassSeed[] = [
  {
    id: "class-shoushan-intro",
    title: "寿山石雕入门体验课",
    summary: "跟随传承人认识寿山石，亲手刻一枚属于自己的小印章。",
    price: 16800,
    capacity: 12,
    schedule: "每周六 14:00-16:00",
    location: "福州市晋安区寿山乡",
    image: "/images/resources/shoushan.jpg",
  },
  {
    id: "class-jasmine-tea",
    title: "茉莉花茶窨制体验课",
    summary: "了解窨制技艺，亲手窨一罐茉莉花茶带回家。",
    price: 9800,
    capacity: 20,
    schedule: "每周日 10:00-12:00",
    location: "福州市仓山区城门镇",
    image: "/images/resources/molihua.jpg",
  },
  {
    id: "class-tuotaiqi",
    title: "脱胎漆器髹饰体验课",
    summary: "从打磨、髹漆到推光，做一只自己的小漆杯。",
    price: 19800,
    capacity: 10,
    schedule: "每周六 09:30-12:00",
    location: "福州市鼓楼区三坊七巷",
    image: "/images/resources/tuotaiqi.jpg",
  },
  {
    id: "class-ruanmuhua",
    title: "软木画拼贴体验课",
    summary: "用软木薄片拼出三山两塔，装进一盏小夜灯。",
    price: 12800,
    capacity: 16,
    schedule: "每周日 14:00-16:30",
    location: "福州市鼓楼区南后街",
    image: "/images/resources/ruanmuhua.jpg",
  },
  {
    id: "class-minju",
    title: "闽剧身段入门课",
    summary: "跟闽剧演员学水袖、台步与一句福州唱腔。",
    price: 8800,
    capacity: 20,
    schedule: "每周三 19:00-20:30",
    location: "福州市台江区上下杭",
    image: "/images/resources/minju.jpg",
  },
  {
    id: "class-fishball",
    title: "福州鱼丸手作课",
    summary: "从打鱼浆到包馅，亲手做一碗福州鱼丸。",
    price: 11800,
    capacity: 15,
    schedule: "每周六 10:00-12:00",
    location: "福州市台江区上下杭",
    image: "/images/resources/fuzhou-fishball.jpg",
  },
];
