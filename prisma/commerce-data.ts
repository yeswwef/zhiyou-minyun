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
