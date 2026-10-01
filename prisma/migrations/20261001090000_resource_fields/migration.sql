ALTER TABLE `Resource`
  ADD COLUMN `slug` VARCHAR(191) NULL,
  ADD COLUMN `district` VARCHAR(191) NULL,
  ADD COLUMN `image` VARCHAR(191) NULL,
  ADD COLUMN `recommendationWeight` INTEGER NOT NULL DEFAULT 0;

UPDATE `Resource` SET `slug` = `id` WHERE `slug` IS NULL;

ALTER TABLE `Resource`
  MODIFY `slug` VARCHAR(191) NOT NULL;

CREATE UNIQUE INDEX `Resource_slug_key` ON `Resource`(`slug`);
