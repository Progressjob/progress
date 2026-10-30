-- New employers wait for admin review. Direct posting stays opt-in.
ALTER TABLE "companies" ALTER COLUMN "can_self_publish_jobs" SET DEFAULT false;

UPDATE "companies"
SET "can_self_publish_jobs" = false
WHERE "verification_status" = 'pending';
