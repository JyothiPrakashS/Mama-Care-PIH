-- CreateTable
CREATE TABLE "CareProgram" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientProgram" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientProgram_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CareProgram_name_key" ON "CareProgram"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CareProgram_code_key" ON "CareProgram"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PatientProgram_patientId_programId_key" ON "PatientProgram"("patientId", "programId");

-- AddForeignKey
ALTER TABLE "PatientProgram" ADD CONSTRAINT "PatientProgram_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientProgram" ADD CONSTRAINT "PatientProgram_programId_fkey" FOREIGN KEY ("programId") REFERENCES "CareProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
