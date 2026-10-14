-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('active', 'pending', 'suspended');

-- CreateEnum
CREATE TYPE "CompanyMemberRole" AS ENUM ('owner', 'recruiter', 'hiring_manager');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('invited', 'active', 'revoked');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('pending', 'verified', 'rejected');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('draft', 'pending_review', 'published', 'rejected', 'closed', 'archived');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('full_time', 'part_time', 'contract', 'internship', 'temporary', 'volunteer');

-- CreateEnum
CREATE TYPE "WorkplaceType" AS ENUM ('on_site', 'hybrid', 'remote');

-- CreateEnum
CREATE TYPE "ApplicationMethod" AS ENUM ('internal', 'external_url', 'email');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('text', 'number', 'yes_no', 'single_choice', 'multiple_choice');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('submitted', 'reviewing', 'shortlisted', 'interview', 'offered', 'hired', 'rejected', 'withdrawn');

-- CreateEnum
CREATE TYPE "InterviewType" AS ENUM ('in_person', 'phone', 'video');

-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('scheduled', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "FileCategory" AS ENUM ('cv', 'logo', 'profile_image', 'document');

-- CreateEnum
CREATE TYPE "ProfileVisibility" AS ENUM ('public', 'employers', 'private');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('pending', 'reviewing', 'resolved', 'dismissed');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(30),
    "password_hash" TEXT NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "account_status" "AccountStatus" NOT NULL DEFAULT 'active',
    "email_verified_at" TIMESTAMPTZ,
    "phone_verified_at" TIMESTAMPTZ,
    "last_login_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" SMALLSERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" UUID NOT NULL,
    "role_id" SMALLINT NOT NULL,
    "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "revoked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "headline" VARCHAR(200),
    "summary" TEXT,
    "date_of_birth" DATE,
    "gender" VARCHAR(30),
    "country" VARCHAR(100),
    "region" VARCHAR(100),
    "city" VARCHAR(100),
    "address" TEXT,
    "years_experience" DECIMAL(4,1),
    "current_salary" DECIMAL(12,2),
    "salary_currency" CHAR(3),
    "expected_salary" DECIMAL(12,2),
    "availability_status" VARCHAR(30),
    "profile_visibility" "ProfileVisibility" NOT NULL DEFAULT 'employers',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "candidate_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_educations" (
    "id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "institution" VARCHAR(255) NOT NULL,
    "qualification" VARCHAR(150),
    "field_of_study" VARCHAR(150),
    "start_date" DATE,
    "end_date" DATE,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "grade" VARCHAR(100),
    "description" TEXT,

    CONSTRAINT "candidate_educations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_experiences" (
    "id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "company_name" VARCHAR(255) NOT NULL,
    "job_title" VARCHAR(200) NOT NULL,
    "employment_type" VARCHAR(50),
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,

    CONSTRAINT "candidate_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_skills" (
    "candidate_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "proficiency_level" VARCHAR(30),
    "years_experience" DECIMAL(4,1),

    CONSTRAINT "candidate_skills_pkey" PRIMARY KEY ("candidate_id","skill_id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" UUID NOT NULL,
    "owner_user_id" UUID,
    "storage_key" TEXT NOT NULL,
    "original_filename" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "file_category" "FileCategory" NOT NULL,
    "is_private" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_resumes" (
    "id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_resumes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "industries" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(180) NOT NULL,
    "parent_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "industries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "logo_file_id" UUID,
    "industry_id" UUID,
    "description" TEXT,
    "website_url" TEXT,
    "email" VARCHAR(255),
    "phone" VARCHAR(30),
    "country" VARCHAR(100) NOT NULL DEFAULT 'Ethiopia',
    "region" VARCHAR(100),
    "city" VARCHAR(100),
    "address" TEXT,
    "company_size" VARCHAR(50),
    "founded_year" SMALLINT,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'pending',
    "verified_at" TIMESTAMPTZ,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_members" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "member_role" "CompanyMemberRole" NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'active',
    "invited_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_verification_documents" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "document_type" VARCHAR(50) NOT NULL,
    "review_status" "VerificationStatus" NOT NULL DEFAULT 'pending',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ,
    "review_note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_verification_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_categories" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(180) NOT NULL,
    "parent_id" UUID,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "job_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" UUID NOT NULL,
    "country" VARCHAR(100) NOT NULL,
    "region" VARCHAR(100),
    "city" VARCHAR(100),
    "sub_city" VARCHAR(100),
    "name" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(220) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "location_id" UUID,
    "title" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(280) NOT NULL,
    "reference_code" VARCHAR(100),
    "summary" TEXT,
    "description" TEXT NOT NULL,
    "responsibilities" TEXT,
    "requirements" TEXT,
    "education_requirement" TEXT,
    "experience_min_years" DECIMAL(4,1),
    "experience_max_years" DECIMAL(4,1),
    "employment_type" "EmploymentType" NOT NULL,
    "career_level" VARCHAR(50),
    "workplace_type" "WorkplaceType" NOT NULL DEFAULT 'on_site',
    "salary_min" DECIMAL(12,2),
    "salary_max" DECIMAL(12,2),
    "salary_currency" CHAR(3),
    "salary_visibility" BOOLEAN NOT NULL DEFAULT false,
    "vacancies_count" INTEGER NOT NULL DEFAULT 1,
    "application_method" "ApplicationMethod" NOT NULL DEFAULT 'internal',
    "application_url" TEXT,
    "application_email" VARCHAR(255),
    "application_instructions" TEXT,
    "posted_at" TIMESTAMPTZ,
    "application_deadline" DATE NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'draft',
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "is_easy_apply" BOOLEAN NOT NULL DEFAULT false,
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "search_vector" tsvector,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_skills" (
    "job_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "job_skills_pkey" PRIMARY KEY ("job_id","skill_id")
);

-- CreateTable
CREATE TABLE "job_screening_questions" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "question_text" TEXT NOT NULL,
    "question_type" "QuestionType" NOT NULL,
    "options" JSONB,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "job_screening_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "resume_id" UUID,
    "cover_letter" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'submitted',
    "applied_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "withdrawn_at" TIMESTAMPTZ,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_answers" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "answer_text" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_events" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "changed_by" UUID NOT NULL,
    "old_status" "ApplicationStatus",
    "new_status" "ApplicationStatus" NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interviews" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "scheduled_by" UUID NOT NULL,
    "interview_type" "InterviewType" NOT NULL,
    "scheduled_at" TIMESTAMPTZ NOT NULL,
    "location_or_link" TEXT,
    "status" "InterviewStatus" NOT NULL DEFAULT 'scheduled',
    "feedback" TEXT,

    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_jobs" (
    "candidate_id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_jobs_pkey" PRIMARY KEY ("candidate_id","job_id")
);

-- CreateTable
CREATE TABLE "job_views" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "user_id" UUID,
    "session_id" VARCHAR(100),
    "viewed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" VARCHAR(50),

    CONSTRAINT "job_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "reference_type" VARCHAR(50),
    "reference_id" UUID,
    "read_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "notification_type" VARCHAR(50) NOT NULL,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sms_enabled" BOOLEAN NOT NULL DEFAULT false,
    "in_app_enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_reports" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "reported_by" UUID,
    "reason" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'pending',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID,
    "details" JSONB,
    "ip_address" INET,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "name" VARCHAR(200) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'new',
    "assigned_to" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_expires_at_idx" ON "refresh_tokens"("user_id", "expires_at");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_expires_at_idx" ON "password_reset_tokens"("user_id", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_profiles_user_id_key" ON "candidate_profiles"("user_id");

-- CreateIndex
CREATE INDEX "candidate_educations_candidate_id_idx" ON "candidate_educations"("candidate_id");

-- CreateIndex
CREATE INDEX "candidate_experiences_candidate_id_idx" ON "candidate_experiences"("candidate_id");

-- CreateIndex
CREATE UNIQUE INDEX "skills_name_key" ON "skills"("name");

-- CreateIndex
CREATE UNIQUE INDEX "files_storage_key_key" ON "files"("storage_key");

-- CreateIndex
CREATE INDEX "files_owner_user_id_idx" ON "files"("owner_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_resumes_file_id_key" ON "candidate_resumes"("file_id");

-- CreateIndex
CREATE INDEX "candidate_resumes_candidate_id_idx" ON "candidate_resumes"("candidate_id");

-- CreateIndex
CREATE UNIQUE INDEX "industries_slug_key" ON "industries"("slug");

-- CreateIndex
CREATE INDEX "industries_parent_id_idx" ON "industries"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");

-- CreateIndex
CREATE INDEX "companies_industry_id_idx" ON "companies"("industry_id");

-- CreateIndex
CREATE INDEX "company_members_user_id_status_idx" ON "company_members"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "company_members_company_id_user_id_key" ON "company_members"("company_id", "user_id");

-- CreateIndex
CREATE INDEX "company_verification_documents_company_id_review_status_idx" ON "company_verification_documents"("company_id", "review_status");

-- CreateIndex
CREATE UNIQUE INDEX "job_categories_slug_key" ON "job_categories"("slug");

-- CreateIndex
CREATE INDEX "job_categories_parent_id_idx" ON "job_categories"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "locations_slug_key" ON "locations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_slug_key" ON "jobs"("slug");

-- CreateIndex
CREATE INDEX "jobs_status_posted_at_idx" ON "jobs"("status", "posted_at" DESC);

-- CreateIndex
CREATE INDEX "jobs_category_id_status_idx" ON "jobs"("category_id", "status");

-- CreateIndex
CREATE INDEX "jobs_location_id_status_idx" ON "jobs"("location_id", "status");

-- CreateIndex
CREATE INDEX "jobs_company_id_status_idx" ON "jobs"("company_id", "status");

-- CreateIndex
CREATE INDEX "jobs_application_deadline_status_idx" ON "jobs"("application_deadline", "status");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_company_id_reference_code_key" ON "jobs"("company_id", "reference_code");

-- CreateIndex
CREATE INDEX "job_screening_questions_job_id_sort_order_idx" ON "job_screening_questions"("job_id", "sort_order");

-- CreateIndex
CREATE INDEX "applications_candidate_id_applied_at_idx" ON "applications"("candidate_id", "applied_at" DESC);

-- CreateIndex
CREATE INDEX "applications_job_id_status_applied_at_idx" ON "applications"("job_id", "status", "applied_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "applications_job_id_candidate_id_key" ON "applications"("job_id", "candidate_id");

-- CreateIndex
CREATE UNIQUE INDEX "application_answers_application_id_question_id_key" ON "application_answers"("application_id", "question_id");

-- CreateIndex
CREATE INDEX "application_events_application_id_created_at_idx" ON "application_events"("application_id", "created_at");

-- CreateIndex
CREATE INDEX "interviews_application_id_scheduled_at_idx" ON "interviews"("application_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "job_views_job_id_viewed_at_idx" ON "job_views"("job_id", "viewed_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_created_at_idx" ON "notifications"("user_id", "read_at", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_notification_type_key" ON "notification_preferences"("user_id", "notification_type");

-- CreateIndex
CREATE INDEX "job_reports_status_created_at_idx" ON "job_reports"("status", "created_at");

-- CreateIndex
CREATE INDEX "admin_audit_logs_actor_user_id_created_at_idx" ON "admin_audit_logs"("actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "admin_audit_logs_entity_type_entity_id_idx" ON "admin_audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "contact_messages_status_created_at_idx" ON "contact_messages"("status", "created_at");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_profiles" ADD CONSTRAINT "candidate_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_educations" ADD CONSTRAINT "candidate_educations_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_experiences" ADD CONSTRAINT "candidate_experiences_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_skills" ADD CONSTRAINT "candidate_skills_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_skills" ADD CONSTRAINT "candidate_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_resumes" ADD CONSTRAINT "candidate_resumes_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_resumes" ADD CONSTRAINT "candidate_resumes_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "industries" ADD CONSTRAINT "industries_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "industries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_logo_file_id_fkey" FOREIGN KEY ("logo_file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_industry_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "industries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_members" ADD CONSTRAINT "company_members_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_members" ADD CONSTRAINT "company_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_members" ADD CONSTRAINT "company_members_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_verification_documents" ADD CONSTRAINT "company_verification_documents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_verification_documents" ADD CONSTRAINT "company_verification_documents_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_verification_documents" ADD CONSTRAINT "company_verification_documents_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_categories" ADD CONSTRAINT "job_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "job_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "job_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_skills" ADD CONSTRAINT "job_skills_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_skills" ADD CONSTRAINT "job_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_screening_questions" ADD CONSTRAINT "job_screening_questions_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidate_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "candidate_resumes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_answers" ADD CONSTRAINT "application_answers_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_answers" ADD CONSTRAINT "application_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "job_screening_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_events" ADD CONSTRAINT "application_events_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_events" ADD CONSTRAINT "application_events_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_scheduled_by_fkey" FOREIGN KEY ("scheduled_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_jobs" ADD CONSTRAINT "saved_jobs_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_jobs" ADD CONSTRAINT "saved_jobs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_views" ADD CONSTRAINT "job_views_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_views" ADD CONSTRAINT "job_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_reports" ADD CONSTRAINT "job_reports_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_reports" ADD CONSTRAINT "job_reports_reported_by_fkey" FOREIGN KEY ("reported_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_reports" ADD CONSTRAINT "job_reports_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Domain constraints not expressible in Prisma schema.
ALTER TABLE "users" ADD CONSTRAINT "users_login_identifier_check"
  CHECK ("email" IS NOT NULL OR "phone" IS NOT NULL);
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_salary_range_check"
  CHECK ("salary_min" IS NULL OR "salary_max" IS NULL OR "salary_min" <= "salary_max");
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_experience_range_check"
  CHECK ("experience_min_years" IS NULL OR "experience_max_years" IS NULL OR "experience_min_years" <= "experience_max_years");
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_vacancies_count_check"
  CHECK ("vacancies_count" >= 1);

-- One default CV per candidate.
CREATE UNIQUE INDEX "candidate_resumes_one_default_idx"
  ON "candidate_resumes" ("candidate_id") WHERE "is_default" = true;

-- PostgreSQL full-text search kept in sync for public job search.
CREATE INDEX "jobs_search_vector_idx" ON "jobs" USING GIN ("search_vector");
CREATE FUNCTION jobs_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;
CREATE TRIGGER jobs_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, summary, description ON "jobs"
  FOR EACH ROW EXECUTE FUNCTION jobs_search_vector_update();
