-- Step 13.3: Replace reverted pregnancy-week schedule tables with intervention-day scheduling domain.
-- Old ProgramSchedule / ProgramActivity / Content / ActivityContent tables are empty (0 rows).

-- Drop old architecture (FK order)
DROP TABLE IF EXISTS "ActivityContent";
DROP TABLE IF EXISTS "ProgramActivity";
DROP TABLE IF EXISTS "ProgramSchedule";
DROP TABLE IF EXISTS "Content";

-- Drop old enums (no remaining dependents)
DROP TYPE IF EXISTS "ActivityType";
DROP TYPE IF EXISTS "ContentType";

-- CreateEnums
CREATE TYPE "ActivityType" AS ENUM ('EXERCISE', 'YOGA', 'BREATHING', 'MUSIC', 'RELAXATION', 'OTHER');
CREATE TYPE "ContentType" AS ENUM ('IMAGE', 'VIDEO', 'PDF', 'DOCUMENT', 'LINK');
CREATE TYPE "ScheduleVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'RETIRED');
CREATE TYPE "ScheduleRuleType" AS ENUM ('REPEAT', 'SEQUENCE');
CREATE TYPE "PatientActivityStatus" AS ENUM ('PENDING', 'COMPLETED', 'MISSED');

-- CreateTable: Activity library
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "description" TEXT,
    "instructions" TEXT,
    "quickNote" TEXT,
    "estimatedMinutes" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Content library
CREATE TABLE "Content" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "ContentType" NOT NULL,
    "storageKey" TEXT,
    "contentUrl" TEXT,
    "thumbnailUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Content_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Activity <-> Content join
CREATE TABLE "ActivityContent" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ActivityContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleTemplate" (
    "id" TEXT NOT NULL,
    "careProgramId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleVersion" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "ScheduleVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "name" TEXT,
    "description" TEXT,
    "publishedAt" TIMESTAMP(3),
    "retiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleRule" (
    "id" TEXT NOT NULL,
    "scheduleVersionId" TEXT NOT NULL,
    "startInterventionDay" INTEGER NOT NULL,
    "endInterventionDay" INTEGER NOT NULL,
    "ruleType" "ScheduleRuleType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleRuleItem" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleRuleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientScheduleAssignment" (
    "id" TEXT NOT NULL,
    "patientProgramId" TEXT NOT NULL,
    "scheduleVersionId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT NOT NULL,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientScheduleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientActivityOverride" (
    "id" TEXT NOT NULL,
    "patientScheduleAssignmentId" TEXT NOT NULL,
    "interventionDay" INTEGER NOT NULL,
    "originalActivityId" TEXT,
    "replacementActivityId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "reason" TEXT,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientActivityOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientActivityRecord" (
    "id" TEXT NOT NULL,
    "patientProgramId" TEXT NOT NULL,
    "interventionDay" INTEGER NOT NULL,
    "activityId" TEXT NOT NULL,
    "status" "PatientActivityStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientActivityRecord_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "Activity_type_isActive_idx" ON "Activity"("type", "isActive");
CREATE INDEX "Activity_title_idx" ON "Activity"("title");

CREATE INDEX "ActivityContent_activityId_displayOrder_idx" ON "ActivityContent"("activityId", "displayOrder");
CREATE UNIQUE INDEX "ActivityContent_activityId_contentId_key" ON "ActivityContent"("activityId", "contentId");

CREATE INDEX "ScheduleTemplate_careProgramId_isActive_idx" ON "ScheduleTemplate"("careProgramId", "isActive");
CREATE UNIQUE INDEX "ScheduleTemplate_careProgramId_code_key" ON "ScheduleTemplate"("careProgramId", "code");

CREATE INDEX "ScheduleVersion_templateId_status_idx" ON "ScheduleVersion"("templateId", "status");
CREATE UNIQUE INDEX "ScheduleVersion_templateId_versionNumber_key" ON "ScheduleVersion"("templateId", "versionNumber");

CREATE INDEX "ScheduleRule_scheduleVersionId_startInterventionDay_endInte_idx" ON "ScheduleRule"("scheduleVersionId", "startInterventionDay", "endInterventionDay");

CREATE INDEX "ScheduleRuleItem_activityId_idx" ON "ScheduleRuleItem"("activityId");
CREATE UNIQUE INDEX "ScheduleRuleItem_ruleId_position_key" ON "ScheduleRuleItem"("ruleId", "position");

CREATE INDEX "PatientScheduleAssignment_patientProgramId_endedAt_idx" ON "PatientScheduleAssignment"("patientProgramId", "endedAt");
CREATE INDEX "PatientScheduleAssignment_scheduleVersionId_idx" ON "PatientScheduleAssignment"("scheduleVersionId");
CREATE INDEX "PatientScheduleAssignment_assignedBy_idx" ON "PatientScheduleAssignment"("assignedBy");

CREATE INDEX "PatientActivityOverride_patientScheduleAssignmentId_interve_idx" ON "PatientActivityOverride"("patientScheduleAssignmentId", "interventionDay");
CREATE INDEX "PatientActivityOverride_replacementActivityId_idx" ON "PatientActivityOverride"("replacementActivityId");
CREATE INDEX "PatientActivityOverride_createdBy_idx" ON "PatientActivityOverride"("createdBy");

CREATE INDEX "PatientActivityRecord_patientProgramId_status_idx" ON "PatientActivityRecord"("patientProgramId", "status");
CREATE INDEX "PatientActivityRecord_activityId_idx" ON "PatientActivityRecord"("activityId");
CREATE UNIQUE INDEX "PatientActivityRecord_patientProgramId_interventionDay_key" ON "PatientActivityRecord"("patientProgramId", "interventionDay");

-- Foreign keys
ALTER TABLE "ActivityContent" ADD CONSTRAINT "ActivityContent_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActivityContent" ADD CONSTRAINT "ActivityContent_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ScheduleTemplate" ADD CONSTRAINT "ScheduleTemplate_careProgramId_fkey" FOREIGN KEY ("careProgramId") REFERENCES "CareProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ScheduleVersion" ADD CONSTRAINT "ScheduleVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ScheduleTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ScheduleRule" ADD CONSTRAINT "ScheduleRule_scheduleVersionId_fkey" FOREIGN KEY ("scheduleVersionId") REFERENCES "ScheduleVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ScheduleRuleItem" ADD CONSTRAINT "ScheduleRuleItem_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "ScheduleRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScheduleRuleItem" ADD CONSTRAINT "ScheduleRuleItem_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PatientScheduleAssignment" ADD CONSTRAINT "PatientScheduleAssignment_patientProgramId_fkey" FOREIGN KEY ("patientProgramId") REFERENCES "PatientProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientScheduleAssignment" ADD CONSTRAINT "PatientScheduleAssignment_scheduleVersionId_fkey" FOREIGN KEY ("scheduleVersionId") REFERENCES "ScheduleVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientScheduleAssignment" ADD CONSTRAINT "PatientScheduleAssignment_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PatientActivityOverride" ADD CONSTRAINT "PatientActivityOverride_patientScheduleAssignmentId_fkey" FOREIGN KEY ("patientScheduleAssignmentId") REFERENCES "PatientScheduleAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientActivityOverride" ADD CONSTRAINT "PatientActivityOverride_originalActivityId_fkey" FOREIGN KEY ("originalActivityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PatientActivityOverride" ADD CONSTRAINT "PatientActivityOverride_replacementActivityId_fkey" FOREIGN KEY ("replacementActivityId") REFERENCES "Activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientActivityOverride" ADD CONSTRAINT "PatientActivityOverride_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PatientActivityRecord" ADD CONSTRAINT "PatientActivityRecord_patientProgramId_fkey" FOREIGN KEY ("patientProgramId") REFERENCES "PatientProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientActivityRecord" ADD CONSTRAINT "PatientActivityRecord_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
