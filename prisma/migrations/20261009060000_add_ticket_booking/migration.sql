ALTER TABLE `User` MODIFY `role` ENUM('C', 'B', 'ADMIN') NOT NULL DEFAULT 'C';

CREATE TABLE `Venue` (
  `id` VARCHAR(191) NOT NULL, `type` ENUM('SCENIC','MUSEUM','PERFORMANCE') NOT NULL,
  `name` VARCHAR(191) NOT NULL, `address` VARCHAR(191) NOT NULL, `lat` DOUBLE NULL,
  `lng` DOUBLE NULL, `contact` VARCHAR(191) NULL, `image` VARCHAR(191) NULL,
  `enabled` BOOLEAN NOT NULL DEFAULT true, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL, PRIMARY KEY (`id`), INDEX `Venue_type_enabled_idx`(`type`,`enabled`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TicketItem` (
  `id` VARCHAR(191) NOT NULL, `venueId` VARCHAR(191) NOT NULL, `createdByAdminId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL, `summary` TEXT NOT NULL, `description` TEXT NULL, `notice` TEXT NULL,
  `image` VARCHAR(191) NULL, `status` ENUM('DRAFT','OPEN','PAUSED','CLOSED') NOT NULL DEFAULT 'DRAFT',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`), INDEX `TicketItem_venueId_status_idx`(`venueId`,`status`), INDEX `TicketItem_createdByAdminId_idx`(`createdByAdminId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TicketSlot` (
  `id` VARCHAR(191) NOT NULL, `ticketItemId` VARCHAR(191) NOT NULL, `startAt` DATETIME(3) NOT NULL,
  `endAt` DATETIME(3) NOT NULL, `capacity` INTEGER NOT NULL, `bookedCount` INTEGER NOT NULL DEFAULT 0,
  `warningThreshold` INTEGER NOT NULL DEFAULT 80, `status` ENUM('OPEN','CLOSED') NOT NULL DEFAULT 'OPEN',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`), INDEX `TicketSlot_ticketItemId_startAt_idx`(`ticketItemId`,`startAt`), INDEX `TicketSlot_status_startAt_idx`(`status`,`startAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TicketBooking` (
  `id` VARCHAR(191) NOT NULL, `bookingNo` VARCHAR(191) NOT NULL, `verifyCode` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL, `slotId` VARCHAR(191) NOT NULL, `quantity` INTEGER NOT NULL DEFAULT 1,
  `contactName` VARCHAR(191) NOT NULL, `contactPhone` VARCHAR(191) NOT NULL,
  `status` ENUM('CONFIRMED','VERIFIED','CANCELLED','EXPIRED') NOT NULL DEFAULT 'CONFIRMED',
  `verifiedAt` DATETIME(3) NULL, `cancelledAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`), UNIQUE INDEX `TicketBooking_bookingNo_key`(`bookingNo`), UNIQUE INDEX `TicketBooking_verifyCode_key`(`verifyCode`),
  INDEX `TicketBooking_userId_createdAt_idx`(`userId`,`createdAt`), INDEX `TicketBooking_slotId_status_idx`(`slotId`,`status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `TicketItem` ADD CONSTRAINT `TicketItem_venueId_fkey` FOREIGN KEY (`venueId`) REFERENCES `Venue`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `TicketItem` ADD CONSTRAINT `TicketItem_createdByAdminId_fkey` FOREIGN KEY (`createdByAdminId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `TicketSlot` ADD CONSTRAINT `TicketSlot_ticketItemId_fkey` FOREIGN KEY (`ticketItemId`) REFERENCES `TicketItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `TicketBooking` ADD CONSTRAINT `TicketBooking_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `TicketBooking` ADD CONSTRAINT `TicketBooking_slotId_fkey` FOREIGN KEY (`slotId`) REFERENCES `TicketSlot`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
