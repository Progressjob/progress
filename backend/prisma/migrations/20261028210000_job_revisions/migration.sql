-- CreateEnum
CREATE TYPE "JobRevisionSource" AS ENUM ('employer', 'admin');

-- CreateTable
CREATE TABLE "job_revisions" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "source" "JobRevisionSource" NOT NULL,
    "changes" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_revisions_job_id_created_at_idx" ON "job_revisions"("job_id", "created_at");

-- CreateIndex
CREATE INDEX "job_revisions_source_idx" ON "job_revisions"("source");

-- AddForeignKey
ALTER TABLE "job_revisions" ADD CONSTRAINT "job_revisions_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_revisions" ADD CONSTRAINT "job_revisions_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
