/*
  Warnings:

  - You are about to drop the column `pricePerHour` on the `resources` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "OfferRecurrence" AS ENUM ('NONE', 'DAILY', 'WEEKDAY', 'WEEKEND', 'WEEKLY');

-- AlterTable
ALTER TABLE "offers" ADD COLUMN     "recurrence" "OfferRecurrence" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "recurrenceDays" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "timeEnd" TEXT,
ADD COLUMN     "timeStart" TEXT,
ALTER COLUMN "validFrom" DROP NOT NULL,
ALTER COLUMN "validUntil" DROP NOT NULL;

-- AlterTable
ALTER TABLE "reservations" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "resources" DROP COLUMN "pricePerHour",
ADD COLUMN     "price" DECIMAL(10,2);

-- CreateIndex
CREATE INDEX "reservations_userId_idx" ON "reservations"("userId");

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
