-- Free-form categories (replaces single sport enum)
ALTER TABLE "match_posts" ADD COLUMN "categories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "match_posts" SET "categories" = CASE
  WHEN "sport" IS NOT NULL THEN ARRAY["sport"::text]
  ELSE ARRAY[]::TEXT[]
END;

ALTER TABLE "match_posts" DROP COLUMN "sport";

-- skillLevel: enum -> plain text
ALTER TABLE "match_posts" ALTER COLUMN "skillLevel" DROP DEFAULT;
ALTER TABLE "match_posts" ALTER COLUMN "skillLevel" TYPE TEXT USING (
  CASE WHEN "skillLevel" IS NULL THEN NULL ELSE "skillLevel"::text END
);
