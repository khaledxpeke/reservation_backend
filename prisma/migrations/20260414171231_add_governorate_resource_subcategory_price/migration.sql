-- AlterTable
ALTER TABLE "partners" ADD COLUMN     "governorate" TEXT;

-- AlterTable
ALTER TABLE "resources" ADD COLUMN     "pricePerHour" DECIMAL(10,2),
ADD COLUMN     "subCategoryId" TEXT;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "sub_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
