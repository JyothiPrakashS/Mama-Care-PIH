-- CreateTable
CREATE TABLE "TenantScheduleAdoption" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "scheduleVersionId" TEXT NOT NULL,
    "adoptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adoptedBy" TEXT NOT NULL,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantScheduleAdoption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TenantScheduleAdoption_tenantId_endedAt_idx" ON "TenantScheduleAdoption"("tenantId", "endedAt");

-- CreateIndex
CREATE INDEX "TenantScheduleAdoption_scheduleVersionId_idx" ON "TenantScheduleAdoption"("scheduleVersionId");

-- CreateIndex
CREATE INDEX "TenantScheduleAdoption_adoptedBy_idx" ON "TenantScheduleAdoption"("adoptedBy");

-- CreateIndex
CREATE UNIQUE INDEX "TenantScheduleAdoption_tenantId_scheduleVersionId_key" ON "TenantScheduleAdoption"("tenantId", "scheduleVersionId");

-- AddForeignKey
ALTER TABLE "TenantScheduleAdoption" ADD CONSTRAINT "TenantScheduleAdoption_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantScheduleAdoption" ADD CONSTRAINT "TenantScheduleAdoption_scheduleVersionId_fkey" FOREIGN KEY ("scheduleVersionId") REFERENCES "ScheduleVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantScheduleAdoption" ADD CONSTRAINT "TenantScheduleAdoption_adoptedBy_fkey" FOREIGN KEY ("adoptedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
