-- 新增票务管理员角色，并为平台注销账号与商户档案补充字段。
ALTER TABLE `User`
  MODIFY COLUMN `role` ENUM('C', 'B', 'ADMIN', 'TICKET_ADMIN') NOT NULL DEFAULT 'C';

ALTER TABLE `User`
  ADD COLUMN `merchantAddress` VARCHAR(191) NULL,
  ADD COLUMN `legalPerson` VARCHAR(191) NULL,
  ADD COLUMN `merchantPhone` VARCHAR(191) NULL,
  ADD COLUMN `creditCode` VARCHAR(191) NULL,
  ADD COLUMN `merchantIntro` TEXT NULL,
  ADD COLUMN `disabledAt` DATETIME(3) NULL;
