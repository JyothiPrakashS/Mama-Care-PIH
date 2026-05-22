import { PrismaClient } from '@prisma/client';

export type PatientProgramSummary = {
  program: {
    name: string;
    code: string;
    isPaid: boolean;
  } | null;
  startDate: string | null;
};

type ActivePatientProgram = {
  patientId: string;
  startDate: Date;
  program: {
    name: string;
    code: string;
    isPaid: boolean;
  };
};

export function formatProgramStartDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function buildPatientProgramSummary(
  assignment?: ActivePatientProgram | null,
): PatientProgramSummary {
  if (!assignment) {
    return { program: null, startDate: null };
  }

  return {
    program: {
      name: assignment.program.name,
      code: assignment.program.code,
      isPaid: assignment.program.isPaid,
    },
    startDate: formatProgramStartDate(assignment.startDate),
  };
}

export async function fetchActiveProgramsByPatientIds(
  prisma: PrismaClient,
  patientIds: string[],
) {
  if (!patientIds.length) {
    return new Map<string, ActivePatientProgram>();
  }

  const assignments = await prisma.patientProgram.findMany({
    where: {
      patientId: { in: patientIds },
      isActive: true,
    },
    select: {
      patientId: true,
      startDate: true,
      program: {
        select: {
          name: true,
          code: true,
          isPaid: true,
        },
      },
    },
  });

  return new Map(assignments.map((assignment) => [assignment.patientId, assignment]));
}

export async function fetchActiveProgramForPatient(
  prisma: PrismaClient,
  patientId: string,
) {
  return prisma.patientProgram.findFirst({
    where: {
      patientId,
      isActive: true,
    },
    select: {
      patientId: true,
      startDate: true,
      program: {
        select: {
          name: true,
          code: true,
          isPaid: true,
        },
      },
    },
  });
}
