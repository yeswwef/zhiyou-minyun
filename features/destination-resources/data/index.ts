import type { DestinationResource } from "../types";

export const DESTINATION_RESOURCES: DestinationResource[] = [
  { id: "sanfangqixiang", name: "三坊七巷", category: "景点", district: "鼓楼区", tags: ["历史文化", "适合亲子"], image: "/images/sanfangqixiang.jpg", summary: "一片坊巷，半部闽都史。", description: "三坊七巷是福州保存较为完整的传统街区，沿着南后街慢慢走，可以看见古厝、名人故居和城市生活交织的样子。", history: "三坊七巷形成于晋代，至明清时期逐渐完善，保留了大量明清民居建筑。", openingHours: "全天开放，街区内景点开放时间以现场公告为准", address: "福州市鼓楼区南后街",
  },
  { id: "gushan", name: "鼓山", category: "景点", district: "晋安区", tags: ["5A", "自然风光", "适合亲子"], image: "/images/gushan.jpg", summary: "登高望海，涌泉听钟。", description: "鼓山临江面海，山林清幽，涌泉寺和摩崖石刻是这里最值得慢慢探访的文化景观。", history: "鼓山自古就是福州名胜，唐宋以来文人雅士多有题刻，涌泉寺始建于唐代。", openingHours: "06:00-17:30", address: "福州市晋安区鼓山镇",
  },
  { id: "xihu", name: "福州西湖", category: "景点", district: "鼓楼区", tags: ["城市漫步", "适合亲子"], image: "/images/xihu.jpg", summary: "湖光树影里的榕城日常。", description: "西湖公园四季皆宜，适合散步、赏花和看一场日落，是福州人熟悉的城市绿洲。", history: "福州西湖开凿于晋太康年间，至今已有一千七百多年的历史。", openingHours: "05:30-22:30", address: "福州市鼓楼区湖滨路70号",
  },
  { id: "moyan", name: "寿山石雕", category: "非遗", district: "晋安区", tags: ["非物质文化遗产", "传统技艺"], image: "/images/zhenhailou.jpg", summary: "一方石头，藏着闽地的巧思。", description: "寿山石雕以寿山石为材料，讲究因材施艺，题材涵盖人物、动物、山水和花鸟。", history: "寿山石雕技艺源远流长，唐宋以来逐渐形成独特的雕刻风格，是福州重要的传统工艺。", openingHours: "工作室开放时间以预约为准", address: "福州市晋安区寿山乡",
  },
  { id: "moli", name: "茉莉花茶窨制技艺", category: "非遗", district: "仓山区", tags: ["世界遗产", "传统技艺", "体验"], image: "/images/molihua.jpg", summary: "一朵茉莉，窨出一城清香。", description: "福州茉莉花茶窨制技艺将茶叶与茉莉鲜花反复拼和，让花香与茶韵自然融合。", history: "福州茉莉花茶制作历史悠久，相关传统技艺入选国家级非物质文化遗产代表性项目。", openingHours: "体验活动需提前预约", address: "福州市仓山区城门镇",
  },
  { id: "fuzhou-fishball", name: "福州鱼丸", category: "美食", district: "鼓楼区", tags: ["地方风味", "适合亲子"], image: "/images/shangxiahang.jpg", summary: "一口弹牙，是福州人的乡愁。", description: "福州鱼丸以鱼肉制皮、肉馅为心，汤清味鲜，是来福州旅行不可错过的地方小吃。", history: "鱼丸在福州已有数百年制作传统，选料和手工打制是风味关键。", openingHours: "各店营业时间不同，建议出发前查询", address: "福州市鼓楼区、台江区多家老字号",
  },
];

export const RESOURCE_TAGS = ["世界遗产", "5A", "适合亲子", "历史文化", "自然风光", "传统技艺"];
