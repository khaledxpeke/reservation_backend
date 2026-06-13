-- Baseline for match / customer features that previously existed only via `db push`.
-- Without this, shadow DB replay fails on `20260504120000_announce_kinds_schedule_partner`
-- with P1014 (relation "match_posts" does not exist).
--
-- This migration is written to be idempotent because many dev DBs were created via
-- `prisma db push` before being put under migrations.

-- Customer accounts (add enum value if missing)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole') AND
     NOT EXISTS (
       SELECT 1
       FROM pg_enum e
       JOIN pg_type t ON t.oid = e.enumtypid
       WHERE t.typname = 'UserRole' AND e.enumlabel = 'CUSTOMER'
     ) THEN
    EXECUTE 'ALTER TYPE "UserRole" ADD VALUE ''CUSTOMER''';
  END IF;
END $$;

-- Enums (create if missing)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Gender') THEN
    EXECUTE 'CREATE TYPE "Gender" AS ENUM (''MALE'', ''FEMALE'', ''OTHER'')';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GenderPreference') THEN
    EXECUTE 'CREATE TYPE "GenderPreference" AS ENUM (''ANY'', ''MALE'', ''FEMALE'')';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SkillLevel') THEN
    EXECUTE 'CREATE TYPE "SkillLevel" AS ENUM (''BEGINNER'', ''INTERMEDIATE'', ''ADVANCED'')';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SportType') THEN
    EXECUTE 'CREATE TYPE "SportType" AS ENUM (''PADEL'', ''TENNIS'', ''FOOTBALL'', ''BASKETBALL'', ''VOLLEYBALL'', ''OTHER'')';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MatchPostStatus') THEN
    EXECUTE 'CREATE TYPE "MatchPostStatus" AS ENUM (''OPEN'', ''CLOSED'', ''CANCELLED'')';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MatchRequestStatus') THEN
    EXECUTE 'CREATE TYPE "MatchRequestStatus" AS ENUM (''PENDING'', ''ACCEPTED'', ''DECLINED'')';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationType') THEN
    EXECUTE 'CREATE TYPE "NotificationType" AS ENUM (''MATCH_REQUEST_RECEIVED'', ''MATCH_REQUEST_ACCEPTED'', ''MATCH_REQUEST_DECLINED'', ''MATCH_POST_CANCELLED'', ''MATCH_POST_FULL'', ''MATCH_POST_EXPIRED'', ''MATCH_CHAT_MESSAGE'')';
  END IF;
END $$;

-- Customer profiles
CREATE TABLE IF NOT EXISTS "customer_profiles" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "gender" "Gender" NOT NULL,
  "dob" DATE NOT NULL,
  "phone" TEXT NOT NULL,
  "region" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "customer_profiles_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'customer_profiles_userId_key') THEN
    EXECUTE 'CREATE UNIQUE INDEX "customer_profiles_userId_key" ON "customer_profiles"("userId")';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'customer_profiles_userId_fkey'
  ) THEN
    EXECUTE 'ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE';
  END IF;
END $$;

-- Notifications
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "url" TEXT,
  "data" JSONB,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'notifications_userId_createdAt_idx') THEN
    EXECUTE 'CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt")';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'notifications_userId_readAt_idx') THEN
    EXECUTE 'CREATE INDEX "notifications_userId_readAt_idx" ON "notifications"("userId", "readAt")';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'notifications_userId_fkey'
  ) THEN
    EXECUTE 'ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE';
  END IF;
END $$;

-- Match posts — shape expected by `20260504120000_announce_kinds_schedule_partner`
CREATE TABLE IF NOT EXISTS "match_posts" (
  "id" TEXT NOT NULL,
  "creatorId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "neededPlayers" INTEGER NOT NULL,
  "governorate" TEXT,
  "city" TEXT,
  "sport" "SportType" NOT NULL DEFAULT 'OTHER',
  "skillLevel" "SkillLevel" NOT NULL DEFAULT 'BEGINNER',
  "genderPref" "GenderPreference" NOT NULL DEFAULT 'ANY',
  "description" TEXT,
  "status" "MatchPostStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "match_posts_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'match_posts_creatorId_fkey'
  ) THEN
    EXECUTE 'ALTER TABLE "match_posts" ADD CONSTRAINT "match_posts_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'match_posts_date_status_idx') THEN
    EXECUTE 'CREATE INDEX "match_posts_date_status_idx" ON "match_posts"("date", "status")';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'match_posts_governorate_status_idx') THEN
    EXECUTE 'CREATE INDEX "match_posts_governorate_status_idx" ON "match_posts"("governorate", "status")';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "match_join_requests" (
  "id" TEXT NOT NULL,
  "matchPostId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "message" TEXT,
  "status" "MatchRequestStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "match_join_requests_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'match_join_requests_matchPostId_userId_key') THEN
    EXECUTE 'CREATE UNIQUE INDEX "match_join_requests_matchPostId_userId_key" ON "match_join_requests"("matchPostId", "userId")';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'match_join_requests_matchPostId_fkey'
  ) THEN
    EXECUTE 'ALTER TABLE "match_join_requests" ADD CONSTRAINT "match_join_requests_matchPostId_fkey" FOREIGN KEY ("matchPostId") REFERENCES "match_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'match_join_requests_userId_fkey'
  ) THEN
    EXECUTE 'ALTER TABLE "match_join_requests" ADD CONSTRAINT "match_join_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'match_join_requests_userId_idx') THEN
    EXECUTE 'CREATE INDEX "match_join_requests_userId_idx" ON "match_join_requests"("userId")';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "chat_messages" (
  "id" TEXT NOT NULL,
  "matchPostId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'chat_messages_matchPostId_createdAt_idx') THEN
    EXECUTE 'CREATE INDEX "chat_messages_matchPostId_createdAt_idx" ON "chat_messages"("matchPostId", "createdAt")';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'chat_messages_matchPostId_fkey'
  ) THEN
    EXECUTE 'ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_matchPostId_fkey" FOREIGN KEY ("matchPostId") REFERENCES "match_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'chat_messages_senderId_fkey'
  ) THEN
    EXECUTE 'ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE';
  END IF;
END $$;
