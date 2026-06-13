-- CreateEnum
CREATE TYPE "MatchLeaveStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'DECLINED');

-- AlterTable
ALTER TABLE "match_join_requests"
ADD COLUMN     "leaveStatus" "MatchLeaveStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "leaveMessage" TEXT,
ADD COLUMN     "leaveRequestedAt" TIMESTAMP(3),
ADD COLUMN     "leaveResolvedAt" TIMESTAMP(3);

-- ExtendEnum (NotificationType)
ALTER TYPE "NotificationType" ADD VALUE 'MATCH_LEAVE_REQUEST_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE 'MATCH_LEAVE_REQUEST_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE 'MATCH_LEAVE_REQUEST_DECLINED';

