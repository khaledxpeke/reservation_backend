-- Reset announcement data so match posts can require marketplace category/subcategory.
DELETE FROM "chat_messages";
DELETE FROM "match_join_requests";
DELETE FROM "match_posts";

-- AlterTable
ALTER TABLE "match_posts" ADD COLUMN "categoryId" TEXT;
ALTER TABLE "match_posts" ADD COLUMN "subCategoryId" TEXT;

ALTER TABLE "match_posts" ALTER COLUMN "categoryId" SET NOT NULL;
ALTER TABLE "match_posts" ALTER COLUMN "subCategoryId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "match_posts" ADD CONSTRAINT "match_posts_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "match_posts" ADD CONSTRAINT "match_posts_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "sub_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "match_posts_categoryId_idx" ON "match_posts"("categoryId");
CREATE INDEX "match_posts_subCategoryId_idx" ON "match_posts"("subCategoryId");
