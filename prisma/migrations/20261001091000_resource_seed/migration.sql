INSERT INTO `Tag` (`id`, `name`) VALUES
  ('tag-history', '历史文化'),
  ('tag-family', '适合亲子'),
  ('tag-5a', '5A'),
  ('tag-nature', '自然风光'),
  ('tag-ich', '非物质文化遗产'),
  ('tag-craft', '传统技艺'),
  ('tag-world', '世界遗产'),
  ('tag-experience', '体验'),
  ('tag-citywalk', '城市漫步'),
  ('tag-food', '地方风味')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

INSERT INTO `Resource`
  (`id`, `slug`, `type`, `title`, `district`, `image`, `summary`, `description`, `history`, `openTime`, `address`, `source`, `recommendationWeight`, `createdAt`, `updatedAt`)
VALUES
  ('sanfangqixiang', 'sanfangqixiang', 'SCENIC', '三坊七巷', '鼓楼区', '/images/sanfangqixiang.jpg', '一片坊巷，半部闽都史。', '三坊七巷是福州保存较为完整的传统街区，沿着南后街慢慢走，可以看见古厝、名人故居和城市生活交织的样子。', '三坊七巷形成于晋代，至明清时期逐渐完善，保留了大量明清民居建筑。', '全天开放，街区内景点开放时间以现场公告为准', '福州市鼓楼区南后街', '福建文旅公开资料整理（演示数据）', 100, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('gushan', 'gushan', 'SCENIC', '鼓山', '晋安区', '/images/gushan.jpg', '登高望海，涌泉听钟。', '鼓山临江面海，山林清幽，涌泉寺和摩崖石刻是这里最值得慢慢探访的文化景观。', '鼓山自古就是福州名胜，唐宋以来文人雅士多有题刻，涌泉寺始建于唐代。', '06:00-17:30', '福州市晋安区鼓山镇', '福建文旅公开资料整理（演示数据）', 90, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('xihu', 'xihu', 'SCENIC', '福州西湖', '鼓楼区', '/images/xihu.jpg', '湖光树影里的榕城日常。', '西湖公园四季皆宜，适合散步、赏花和看一场日落，是福州人熟悉的城市绿洲。', '福州西湖开凿于晋太康年间，至今已有一千七百多年的历史。', '05:30-22:30', '福州市鼓楼区湖滨路70号', '福建文旅公开资料整理（演示数据）', 70, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('moyan', 'moyan', 'ICH', '寿山石雕', '晋安区', '/images/zhenhailou.jpg', '一方石头，藏着闽地的巧思。', '寿山石雕以寿山石为材料，讲究因材施艺，题材涵盖人物、动物、山水和花鸟。', '寿山石雕技艺源远流长，唐宋以来逐渐形成独特的雕刻风格，是福州重要的传统工艺。', '工作室开放时间以预约为准', '福州市晋安区寿山乡', '福建文旅公开资料整理（演示数据）', 80, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('moli', 'moli', 'ICH', '茉莉花茶窨制技艺', '仓山区', '/images/molihua.jpg', '一朵茉莉，窨出一城清香。', '福州茉莉花茶窨制技艺将茶叶与茉莉鲜花反复拼和，让花香与茶韵自然融合。', '福州茉莉花茶制作历史悠久，相关传统技艺入选国家级非物质文化遗产代表性项目。', '体验活动需提前预约', '福州市仓山区城门镇', '福建文旅公开资料整理（演示数据）', 95, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('fuzhou-fishball', 'fuzhou-fishball', 'FOOD', '福州鱼丸', '鼓楼区', '/images/shangxiahang.jpg', '一口弹牙，是福州人的乡愁。', '福州鱼丸以鱼肉制皮、肉馅为心，汤清味鲜，是来福州旅行不可错过的地方小吃。', '鱼丸在福州已有数百年制作传统，选料和手工打制是风味关键。', '各店营业时间不同，建议出发前查询', '福州市鼓楼区、台江区多家老字号', '福建文旅公开资料整理（演示数据）', 85, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE
  `type` = VALUES(`type`), `title` = VALUES(`title`), `district` = VALUES(`district`), `image` = VALUES(`image`),
  `summary` = VALUES(`summary`), `description` = VALUES(`description`), `history` = VALUES(`history`), `openTime` = VALUES(`openTime`),
  `address` = VALUES(`address`), `source` = VALUES(`source`), `recommendationWeight` = VALUES(`recommendationWeight`), `updatedAt` = CURRENT_TIMESTAMP(3);

DELETE FROM `ResourceTag` WHERE `resourceId` IN ('sanfangqixiang', 'gushan', 'xihu', 'moyan', 'moli', 'fuzhou-fishball');

INSERT INTO `ResourceTag` (`resourceId`, `tagId`) VALUES
  ('sanfangqixiang', 'tag-history'), ('sanfangqixiang', 'tag-family'),
  ('gushan', 'tag-5a'), ('gushan', 'tag-nature'), ('gushan', 'tag-family'),
  ('xihu', 'tag-citywalk'), ('xihu', 'tag-family'),
  ('moyan', 'tag-ich'), ('moyan', 'tag-craft'),
  ('moli', 'tag-world'), ('moli', 'tag-craft'), ('moli', 'tag-experience'),
  ('fuzhou-fishball', 'tag-food'), ('fuzhou-fishball', 'tag-family');
