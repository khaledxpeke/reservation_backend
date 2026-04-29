-- AlterEnum
ALTER TYPE "ReservationStatus" ADD VALUE 'PAID';

-- CreateEnum
CREATE TYPE "FactureStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID');

-- AlterTable
ALTER TABLE "partners" ADD COLUMN "commissionPercent" DECIMAL(5,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "reservation_factures" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "reservationTotal" DECIMAL(10,2) NOT NULL,
    "commissionPercent" DECIMAL(5,2) NOT NULL,
    "amountDue" DECIMAL(10,2) NOT NULL,
    "amountPaid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "FactureStatus" NOT NULL DEFAULT 'UNPAID',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservation_factures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reservation_factures_reference_key" ON "reservation_factures"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "reservation_factures_reservationId_key" ON "reservation_factures"("reservationId");

-- CreateIndex
CREATE INDEX "reservation_factures_partnerId_generatedAt_idx" ON "reservation_factures"("partnerId", "generatedAt");

-- AddForeignKey
ALTER TABLE "reservation_factures" ADD CONSTRAINT "reservation_factures_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_factures" ADD CONSTRAINT "reservation_factures_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
