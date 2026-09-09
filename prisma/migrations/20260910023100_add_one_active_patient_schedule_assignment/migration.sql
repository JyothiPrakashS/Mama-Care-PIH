-- Enforce at most one active PatientScheduleAssignment per PatientProgram.
-- Prisma cannot express PostgreSQL partial unique indexes in schema.prisma,
-- so this constraint is maintained in SQL only. Do not replace it with
-- @@unique([patientProgramId, endedAt]), which would not match the invariant
-- UNIQUE(patientProgramId) WHERE endedAt IS NULL.
CREATE UNIQUE INDEX "PatientScheduleAssignment_one_active_per_program"
ON "PatientScheduleAssignment" ("patientProgramId")
WHERE "endedAt" IS NULL;
