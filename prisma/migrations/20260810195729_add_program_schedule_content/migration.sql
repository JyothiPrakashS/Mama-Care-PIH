-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('EXERCISE', 'YOGA', 'BREATHING', 'EDUCATION', 'NUTRITION', 'REST', 'MEDICATION', 'MONITORING', 'OTHER');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('IMAGE', 'VIDEO', 'PDF', 'PPT', 'DOCUMENT', 'LINK');

-- CreateTable
CREATE TABLE "ProgramSchedule" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "pregnancyWeek" INTEGER NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramActivity" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "ActivityType" NOT NULL,
    "instructions" TEXT,
    "quickNote" TEXT,
    "estimatedMinutes" INTEGER,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "ActivityContent" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ActivityContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProgramSchedule_programId_pregnancyWeek_idx" ON "ProgramSchedule"("programId", "pregnancyWeek");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramSchedule_programId_pregnancyWeek_dayNumber_key" ON "ProgramSchedule"("programId", "pregnancyWeek", "dayNumber");

-- CreateIndex
CREATE INDEX "ProgramActivity_scheduleId_idx" ON "ProgramActivity"("scheduleId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityContent_activityId_contentId_key" ON "ActivityContent"("activityId", "contentId");

-- AddForeignKey
ALTER TABLE "ProgramSchedule" ADD CONSTRAINT "ProgramSchedule_programId_fkey" FOREIGN KEY ("programId") REFERENCES "CareProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramActivity" ADD CONSTRAINT "ProgramActivity_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "ProgramSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityContent" ADD CONSTRAINT "ActivityContent_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "ProgramActivity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityContent" ADD CONSTRAINT "ActivityContent_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
