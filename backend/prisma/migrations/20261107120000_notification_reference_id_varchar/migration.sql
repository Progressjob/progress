-- Allow composite refs (companyId:applicationId) for candidate-review deep links
ALTER TABLE "notifications"
  ALTER COLUMN "reference_id" TYPE VARCHAR(100)
  USING "reference_id"::text;
