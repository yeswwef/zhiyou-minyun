-- MySQL dump 10.13  Distrib 9.4.0, for Win64 (x86_64)
--
-- Host: localhost    Database: zhiyou
-- ------------------------------------------------------
-- Server version	8.0.44

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `zhiyou`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `zhiyou` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `zhiyou`;

--
-- Table structure for table `_prisma_migrations`
--

DROP TABLE IF EXISTS `_prisma_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `_prisma_migrations` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `checksum` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `migration_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `logs` text COLLATE utf8mb4_unicode_ci,
  `rolled_back_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `applied_steps_count` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_prisma_migrations`
--

LOCK TABLES `_prisma_migrations` WRITE;
/*!40000 ALTER TABLE `_prisma_migrations` DISABLE KEYS */;
INSERT INTO `_prisma_migrations` VALUES ('502c85a9-54a6-4894-9816-54517f851cb1','95c33306b0b94206ab3b17c82cc34e5f58bbf384f213e63455c5c30e43c805cb','2026-10-01 05:44:58.404','20261001091000_resource_seed',NULL,NULL,'2026-10-01 05:44:58.382',1),('76a2175d-272b-4e1a-bb23-76b9339f6a6a','4610598ab5c4f1de34086b11323df432a2b5c9ba09f701d70fc99ca0617825e0','2026-10-01 05:42:16.788','20261001090000_resource_fields',NULL,NULL,'2026-10-01 05:42:16.701',1),('dd12ac44-e38d-4c9a-874d-17aa431181b1','2dc0781b4523d7c7c8ed2c224fb43cf9271e7bff8a5ff612b65443ba047d210c','2026-09-26 02:21:19.831','20260926022119_init',NULL,NULL,'2026-09-26 02:21:19.538',1);
/*!40000 ALTER TABLE `_prisma_migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chatmessage`
--

DROP TABLE IF EXISTS `chatmessage`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chatmessage` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sessionId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `citations` json DEFAULT NULL,
  `latencyMs` int DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ChatMessage_sessionId_idx` (`sessionId`),
  CONSTRAINT `ChatMessage_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `chatsession` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chatmessage`
--

LOCK TABLES `chatmessage` WRITE;
/*!40000 ALTER TABLE `chatmessage` DISABLE KEYS */;
/*!40000 ALTER TABLE `chatmessage` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chatsession`
--

DROP TABLE IF EXISTS `chatsession`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chatsession` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `lang` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'zh',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ChatSession_userId_idx` (`userId`),
  CONSTRAINT `ChatSession_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chatsession`
--

LOCK TABLES `chatsession` WRITE;
/*!40000 ALTER TABLE `chatsession` DISABLE KEYS */;
/*!40000 ALTER TABLE `chatsession` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `favorite`
--

DROP TABLE IF EXISTS `favorite`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `favorite` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `resourceId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `Favorite_userId_resourceId_key` (`userId`,`resourceId`),
  KEY `Favorite_resourceId_fkey` (`resourceId`),
  CONSTRAINT `Favorite_resourceId_fkey` FOREIGN KEY (`resourceId`) REFERENCES `resource` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Favorite_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `favorite`
--

LOCK TABLES `favorite` WRITE;
/*!40000 ALTER TABLE `favorite` DISABLE KEYS */;
/*!40000 ALTER TABLE `favorite` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `resource`
--

DROP TABLE IF EXISTS `resource`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `resource` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('SCENIC','FOOD','ICH') COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `summary` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `history` text COLLATE utf8mb4_unicode_ci,
  `openTime` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `traffic` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lat` double DEFAULT NULL,
  `lng` double DEFAULT NULL,
  `goodFor` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `license` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `slug` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `district` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `image` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `recommendationWeight` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `Resource_slug_key` (`slug`),
  KEY `Resource_type_idx` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `resource`
--

LOCK TABLES `resource` WRITE;
/*!40000 ALTER TABLE `resource` DISABLE KEYS */;
INSERT INTO `resource` VALUES ('fuzhou-fishball','FOOD','福州鱼丸','一口弹牙，是福州人的乡愁。','福州鱼丸以鱼肉制皮、肉馅为心，汤清味鲜，是来福州旅行不可错过的地方小吃。','鱼丸在福州已有数百年制作传统，选料和手工打制是风味关键。','各店营业时间不同，建议出发前查询',NULL,'福州市鼓楼区、台江区多家老字号',NULL,NULL,NULL,'福建文旅公开资料整理（演示数据）',NULL,'2026-10-01 13:44:58.395','2026-10-01 13:44:58.395','fuzhou-fishball','鼓楼区','/images/shangxiahang.jpg',85),('gushan','SCENIC','鼓山','登高望海，涌泉听钟。','鼓山临江面海，山林清幽，涌泉寺和摩崖石刻是这里最值得慢慢探访的文化景观。','鼓山自古就是福州名胜，唐宋以来文人雅士多有题刻，涌泉寺始建于唐代。','06:00-17:30',NULL,'福州市晋安区鼓山镇',NULL,NULL,NULL,'福建文旅公开资料整理（演示数据）',NULL,'2026-10-01 13:44:58.395','2026-10-01 13:44:58.395','gushan','晋安区','/images/gushan.jpg',90),('moli','ICH','茉莉花茶窨制技艺','一朵茉莉，窨出一城清香。','福州茉莉花茶窨制技艺将茶叶与茉莉鲜花反复拼和，让花香与茶韵自然融合。','福州茉莉花茶制作历史悠久，相关传统技艺入选国家级非物质文化遗产代表性项目。','体验活动需提前预约',NULL,'福州市仓山区城门镇',NULL,NULL,NULL,'福建文旅公开资料整理（演示数据）',NULL,'2026-10-01 13:44:58.395','2026-10-01 13:44:58.395','moli','仓山区','/images/molihua.jpg',95),('moyan','ICH','寿山石雕','一方石头，藏着闽地的巧思。','寿山石雕以寿山石为材料，讲究因材施艺，题材涵盖人物、动物、山水和花鸟。','寿山石雕技艺源远流长，唐宋以来逐渐形成独特的雕刻风格，是福州重要的传统工艺。','工作室开放时间以预约为准',NULL,'福州市晋安区寿山乡',NULL,NULL,NULL,'福建文旅公开资料整理（演示数据）',NULL,'2026-10-01 13:44:58.395','2026-10-01 13:44:58.395','moyan','晋安区','/images/zhenhailou.jpg',80),('sanfangqixiang','SCENIC','三坊七巷','一片坊巷，半部闽都史。','三坊七巷是福州保存较为完整的传统街区，沿着南后街慢慢走，可以看见古厝、名人故居和城市生活交织的样子。','三坊七巷形成于晋代，至明清时期逐渐完善，保留了大量明清民居建筑。','全天开放，街区内景点开放时间以现场公告为准',NULL,'福州市鼓楼区南后街',NULL,NULL,NULL,'福建文旅公开资料整理（演示数据）',NULL,'2026-10-01 13:44:58.395','2026-10-01 13:44:58.395','sanfangqixiang','鼓楼区','/images/sanfangqixiang.jpg',100),('xihu','SCENIC','福州西湖','湖光树影里的榕城日常。','西湖公园四季皆宜，适合散步、赏花和看一场日落，是福州人熟悉的城市绿洲。','福州西湖开凿于晋太康年间，至今已有一千七百多年的历史。','05:30-22:30',NULL,'福州市鼓楼区湖滨路70号',NULL,NULL,NULL,'福建文旅公开资料整理（演示数据）',NULL,'2026-10-01 13:44:58.395','2026-10-01 13:44:58.395','xihu','鼓楼区','/images/xihu.jpg',70);
/*!40000 ALTER TABLE `resource` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `resourcetag`
--

DROP TABLE IF EXISTS `resourcetag`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `resourcetag` (
  `resourceId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tagId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`resourceId`,`tagId`),
  KEY `ResourceTag_tagId_fkey` (`tagId`),
  CONSTRAINT `ResourceTag_resourceId_fkey` FOREIGN KEY (`resourceId`) REFERENCES `resource` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ResourceTag_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `tag` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `resourcetag`
--

LOCK TABLES `resourcetag` WRITE;
/*!40000 ALTER TABLE `resourcetag` DISABLE KEYS */;
INSERT INTO `resourcetag` VALUES ('gushan','tag-5a'),('xihu','tag-citywalk'),('moli','tag-craft'),('moyan','tag-craft'),('moli','tag-experience'),('fuzhou-fishball','tag-family'),('gushan','tag-family'),('sanfangqixiang','tag-family'),('xihu','tag-family'),('fuzhou-fishball','tag-food'),('sanfangqixiang','tag-history'),('moyan','tag-ich'),('gushan','tag-nature'),('moli','tag-world');
/*!40000 ALTER TABLE `resourcetag` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tag`
--

DROP TABLE IF EXISTS `tag`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tag` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Tag_name_key` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tag`
--

LOCK TABLES `tag` WRITE;
/*!40000 ALTER TABLE `tag` DISABLE KEYS */;
INSERT INTO `tag` VALUES ('tag-5a','5A'),('tag-world','世界遗产'),('tag-craft','传统技艺'),('tag-experience','体验'),('tag-history','历史文化'),('tag-food','地方风味'),('tag-citywalk','城市漫步'),('tag-nature','自然风光'),('tag-family','适合亲子'),('tag-ich','非物质文化遗产');
/*!40000 ALTER TABLE `tag` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user`
--

DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `username` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nickname` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `passwordHash` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('C','B') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'C',
  `merchantName` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `User_username_key` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user`
--

LOCK TABLES `user` WRITE;
/*!40000 ALTER TABLE `user` DISABLE KEYS */;
/*!40000 ALTER TABLE `user` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-01 19:54:37
