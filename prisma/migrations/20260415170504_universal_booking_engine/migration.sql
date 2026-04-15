-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('SPACE', 'SERVICE', 'ITEM');

-- CreateEnum
CREATE TYPE "BookingUnit" AS ENUM ('MINUTES', 'HOURS', 'DAYS');

-- AlterTable
ALTER TABLE "resources" ADD COLUMN     "bookingUnit" "BookingUnit" NOT NULL DEFAULT 'MINUTES',
ADD COLUMN     "bufferTimeMin" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "categoryType" "CategoryType" NOT NULL DEFAULT 'SPACE',
ADD COLUMN     "maxBookingDuration" INTEGER,
ADD COLUMN     "minBookingDuration" INTEGER;
