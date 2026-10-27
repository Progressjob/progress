-- AlterTable
ALTER TABLE "jobs" ADD COLUMN "requested_deadline" DATE,
ADD COLUMN "deadline_change_note" TEXT,
ADD COLUMN "deadline_change_requested_at" TIMESTAMPTZ;
