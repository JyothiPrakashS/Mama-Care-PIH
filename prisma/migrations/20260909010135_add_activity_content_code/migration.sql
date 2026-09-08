-- AlterTable
ALTER TABLE "Activity" ADD COLUMN "code" TEXT;

-- AlterTable
ALTER TABLE "Content" ADD COLUMN "code" TEXT;

-- Backfill deterministic codes for any existing rows (tables expected empty)
UPDATE "Activity" SET "code" = 'ACT_' || REPLACE("id", '-', '') WHERE "code" IS NULL;
UPDATE "Content" SET "code" = 'CNT_' || REPLACE("id", '-', '') WHERE "code" IS NULL;

-- Enforce NOT NULL + unique
ALTER TABLE "Activity" ALTER COLUMN "code" SET NOT NULL;
ALTER TABLE "Content" ALTER COLUMN "code" SET NOT NULL;

CREATE UNIQUE INDEX "Activity_code_key" ON "Activity"("code");
CREATE UNIQUE INDEX "Content_code_key" ON "Content"("code");
