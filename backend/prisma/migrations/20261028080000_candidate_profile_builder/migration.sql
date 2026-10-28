-- AlterTable
ALTER TABLE "candidate_profiles" ADD COLUMN "photo_file_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "candidate_profiles_photo_file_id_key" ON "candidate_profiles"("photo_file_id");

-- AddForeignKey
ALTER TABLE "candidate_profiles" ADD CONSTRAINT "candidate_profiles_photo_file_id_fkey" FOREIGN KEY ("photo_file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "candidate_certifications" (
    "id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "issuer" VARCHAR(255),
    "issued_date" DATE,
    "credential_id" VARCHAR(150),

    CONSTRAINT "candidate_certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_languages" (
    "id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "proficiency" VARCHAR(50),

    CONSTRAINT "candidate_languages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "candidate_certifications_candidate_id_idx" ON "candidate_certifications"("candidate_id");

-- CreateIndex
CREATE INDEX "candidate_languages_candidate_id_idx" ON "candidate_languages"("candidate_id");

-- AddForeignKey
ALTER TABLE "candidate_certifications" ADD CONSTRAINT "candidate_certifications_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_languages" ADD CONSTRAINT "candidate_languages_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
