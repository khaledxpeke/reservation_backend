-- Add nullable first so existing rows can be backfilled.
ALTER TABLE "reservations" ADD COLUMN "reference" TEXT;

-- Backfill existing reservations with stable month-scoped references.
WITH numbered AS (
  SELECT
    "id",
    'RES-' ||
      to_char("createdAt", 'YYYYMM') ||
      '-' ||
      lpad(row_number() OVER (PARTITION BY to_char("createdAt", 'YYYYMM') ORDER BY "createdAt", "id")::text, 4, '0') AS "newReference"
  FROM "reservations"
)
UPDATE "reservations"
SET "reference" = numbered."newReference"
FROM numbered
WHERE "reservations"."id" = numbered."id";

ALTER TABLE "reservations" ALTER COLUMN "reference" SET NOT NULL;

CREATE UNIQUE INDEX "reservations_reference_key" ON "reservations"("reference");
