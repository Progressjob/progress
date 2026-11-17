-- Office walk-in candidates and admin-to-employer recommendations.
-- Additive only: existing profiles default to source "online".

CREATE TYPE "CandidateSource" AS ENUM ('online', 'office');
CREATE TYPE "RecommendationStatus" AS ENUM ('sent', 'viewed', 'interested', 'declined');

ALTER TABLE "users"
  ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "candidate_profiles"
  ADD COLUMN "source" "CandidateSource" NOT NULL DEFAULT 'online',
  ADD COLUMN "national_id" VARCHAR(40),
  ADD COLUMN "registered_by_id" UUID,
  ADD COLUMN "registered_at" TIMESTAMPTZ,
  ADD COLUMN "consent_at" TIMESTAMPTZ,
  ADD COLUMN "office_status" VARCHAR(30);

CREATE UNIQUE INDEX "candidate_profiles_national_id_key" ON "candidate_profiles"("national_id");
CREATE INDEX "candidate_profiles_source_idx" ON "candidate_profiles"("source");

ALTER TABLE "candidate_profiles"
  ADD CONSTRAINT "candidate_profiles_registered_by_id_fkey"
  FOREIGN KEY ("registered_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "candidate_office_records" (
  "candidate_id" UUID NOT NULL,
  "department" VARCHAR(150),
  "category" VARCHAR(150),
  "job_grade" VARCHAR(80),
  "basic_salary_expectation" DECIMAL(12,2),
  "transport_allowance" VARCHAR(80),
  "house_allowance" VARCHAR(80),
  "mobile_allowance" VARCHAR(80),
  "food_coupon" VARCHAR(80),
  "marital_status" VARCHAR(40),
  "place_of_birth" VARCHAR(150),
  "blood_group" VARCHAR(20),
  "mother_name" VARCHAR(150),
  "emergency_contact_name" VARCHAR(150),
  "emergency_relationship" VARCHAR(80),
  "emergency_phone" VARCHAR(30),
  "guarantor_name" VARCHAR(150),
  "guarantor_phone" VARCHAR(30),
  "guarantor_national_id" VARCHAR(40),
  "bank_account" VARCHAR(80),
  "notes" TEXT,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "candidate_office_records_pkey" PRIMARY KEY ("candidate_id"),
  CONSTRAINT "candidate_office_records_candidate_id_fkey"
    FOREIGN KEY ("candidate_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "candidate_recommendations" (
  "id" UUID NOT NULL,
  "candidate_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "job_id" UUID,
  "note" TEXT,
  "recommended_by_id" UUID NOT NULL,
  "status" "RecommendationStatus" NOT NULL DEFAULT 'sent',
  "employer_response" TEXT,
  "viewed_at" TIMESTAMPTZ,
  "responded_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "candidate_recommendations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "candidate_recommendations_candidate_id_fkey"
    FOREIGN KEY ("candidate_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "candidate_recommendations_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "candidate_recommendations_job_id_fkey"
    FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "candidate_recommendations_recommended_by_id_fkey"
    FOREIGN KEY ("recommended_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "candidate_recommendations_candidate_id_company_id_job_id_key"
  ON "candidate_recommendations"("candidate_id", "company_id", "job_id");
CREATE UNIQUE INDEX "candidate_recommendations_no_job_key"
  ON "candidate_recommendations"("candidate_id", "company_id")
  WHERE "job_id" IS NULL;
CREATE INDEX "candidate_recommendations_company_id_status_idx"
  ON "candidate_recommendations"("company_id", "status");
CREATE INDEX "candidate_recommendations_candidate_id_idx"
  ON "candidate_recommendations"("candidate_id");
