-- CreateEnum
CREATE TYPE "CompanyPortalStatus" AS ENUM ('active', 'suspended');

-- AlterTable
ALTER TABLE "companies" ADD COLUMN "portal_status" "CompanyPortalStatus" NOT NULL DEFAULT 'active';
ALTER TABLE "companies" ADD COLUMN "suspended_at" TIMESTAMPTZ;
ALTER TABLE "companies" ADD COLUMN "suspended_reason" TEXT;
