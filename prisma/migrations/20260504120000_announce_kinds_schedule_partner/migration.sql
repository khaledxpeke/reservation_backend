-- CreateEnum
CREATE TYPE "AnnounceKind" AS ENUM ('SPORT', 'TRANSPORT', 'GROUP_BUY', 'EVENT', 'TRAINING', 'TOURNAMENT', 'OTHER');

-- Rename column: match_post.neededPlayers -> neededPeople
ALTER TABLE "match_posts" RENAME COLUMN "neededPlayers" TO "neededPeople";

-- AlterTable
ALTER TABLE "match_posts" ADD COLUMN     "announceKind" "AnnounceKind" NOT NULL DEFAULT 'SPORT';
ALTER TABLE "match_posts" ADD COLUMN     "lastSlotDate" DATE;
UPDATE "match_posts" SET "lastSlotDate" = "date" WHERE "lastSlotDate" IS NULL;
ALTER TABLE "match_posts" ALTER COLUMN "lastSlotDate" SET NOT NULL;

ALTER TABLE "match_posts" ADD COLUMN "scheduleSlots" JSONB;
UPDATE "match_posts" SET "scheduleSlots" = jsonb_build_array(
  jsonb_build_object(
    'date', to_char("date", 'YYYY-MM-DD'),
    'startTime', "startTime",
    'endTime', "endTime"
  )
) WHERE "scheduleSlots" IS NULL;

ALTER TABLE "match_posts" ADD COLUMN "meta" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "match_posts" ADD COLUMN "partnerId" TEXT;

ALTER TABLE "match_posts" ALTER COLUMN "skillLevel" DROP NOT NULL;
ALTER TABLE "match_posts" ALTER COLUMN "sport" DROP NOT NULL;
ALTER TABLE "match_posts" ALTER COLUMN "sport" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "match_posts" ADD CONSTRAINT "match_posts_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "match_posts_lastSlotDate_status_idx" ON "match_posts"("lastSlotDate", "status");
CREATE INDEX "match_posts_partnerId_idx" ON "match_posts"("partnerId");
