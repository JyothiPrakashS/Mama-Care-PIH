import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EntityStatus, Patient, Prisma } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/prisma.service';
import {
  calculateDueDate,
  calculatePregnancyWeek,
  calculateTrimester,
} from 'src/common/utils/pregnancy.util';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { QueryPatientDto } from './dto/query-patient.dto';
import {
  buildPatientProgramSummary,
  fetchActiveProgramForPatient,
  fetchActiveProgramsByPatientIds,
  PatientProgramSummary,
} from 'src/common/utils/patient-enrichment.util';

type PatientWithPregnancyStartDate = Patient & {
  pregnancyStartDate: Date | null;
};

type PatientWithPregnancyInfo = PatientWithPregnancyStartDate & {
  pregnancyWeek?: number;
  trimester?: string;
  dueDate?: Date;
};

type PatientResponse = PatientWithPregnancyInfo & PatientProgramSummary;

@Injectable()
export class PatientService {
  constructor(private prisma: PrismaService) { }

  private parsePregnancyStartDate(value?: string): Date | undefined {
    return value ? new Date(value) : undefined;
  }

  private withPregnancyInfo(patient: PatientWithPregnancyStartDate): PatientWithPregnancyInfo {
    if (!patient.pregnancyStartDate) {
      return patient;
    }

    const pregnancyWeek = calculatePregnancyWeek(patient.pregnancyStartDate);

    return {
      ...patient,
      pregnancyWeek,
      trimester: calculateTrimester(pregnancyWeek),
      dueDate: calculateDueDate(patient.pregnancyStartDate),
    };
  }

  private withPatientDetails(
    patient: PatientWithPregnancyStartDate,
    activeProgram?: Awaited<ReturnType<typeof fetchActiveProgramForPatient>>,
  ): PatientResponse {
    return {
      ...this.withPregnancyInfo(patient),
      ...buildPatientProgramSummary(activeProgram),
    };
  }

  private async enrichPatient(patient: PatientWithPregnancyStartDate): Promise<PatientResponse> {
    const activeProgram = await fetchActiveProgramForPatient(this.prisma, patient.id);
    return this.withPatientDetails(patient, activeProgram);
  }

  private async enrichPatients(patients: PatientWithPregnancyStartDate[]): Promise<PatientResponse[]> {
    const programMap = await fetchActiveProgramsByPatientIds(
      this.prisma,
      patients.map((patient) => patient.id),
    );

    return patients.map((patient) =>
      this.withPatientDetails(patient, programMap.get(patient.id) ?? null),
    );
  }

  private async getAssignedPatientIdsForDoctor(doctorId: string, tenantId: string) {
    const mappings = await this.prisma.doctorPatient.findMany({
      where: {
        doctorId,
        tenantId,
      },
      select: {
        patientId: true,
      },
    });

    return mappings.map((mapping) => mapping.patientId);
  }

  async create(createPatientDto: CreatePatientDto, user: any) {
    const { pregnancyStartDate, password, phone, ...rest } = createPatientDto;
    const normalizedPhone = phone.replace(/\D/g, '');
    const generatedEmail = `${normalizedPhone}@patient.local`;

    const existingUser = await this.prisma.user.findUnique({
      where: { phone },
    });

    if (existingUser) {
      throw new BadRequestException('User already exists with this phone');
    }

    const existingPatient = await this.prisma.patient.findFirst({
      where: {
        phone,
        tenantId: user.tenantId,
        isDeleted: false,
      },
    });

    if (existingPatient) {
      throw new BadRequestException('Patient already exists with this phone');
    }

    const patient = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name: rest.name,
          phone,
          email: generatedEmail,
          password,
          role: 'PATIENT',
          tenantId: user.tenantId,
          mustChangePassword: true,
        },
      });

      return tx.patient.create({
        data: {
          ...rest,
          phone,
          pregnancyStartDate: this.parsePregnancyStartDate(pregnancyStartDate),
          tenantId: user.tenantId,
          createdBy: user.userId,
          userId: createdUser.id,
        } as Prisma.PatientUncheckedCreateInput,
      });
    });

    return this.enrichPatient(patient as PatientWithPregnancyStartDate);
  }

  async getMyProfile(user: any) {
    const patient = await this.prisma.patient.findFirst({
      where: {
        userId: user.userId, 
        tenantId: user.tenantId,
        isDeleted: false,
      },
    });
  
    if (!patient) {
      throw new NotFoundException('Patient profile not found');
    }
  
    return this.enrichPatient(patient as PatientWithPregnancyStartDate);
  }

  async findAll(query: QueryPatientDto, user: any) {

    if (query.includeDeleted || query.isDeleted) {
      if (user.role !== 'PLATFORM_ADMIN') {
        throw new ForbiddenException('Access denied');
      }
    }
    
    const { page = 1, limit = 10, search, isDeleted,
      includeDeleted, } = query;

    // `page`/`limit` often arrive as strings from query params.
    const pageNum = Number.parseInt(String(page), 10) || 1;
    const limitNum = Number.parseInt(String(limit), 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      tenantId: user.tenantId, // 🔥 Tenant isolation
    };

    if (user.role === 'DOCTOR') {
      const assignedPatientIds = await this.getAssignedPatientIdsForDoctor(
        user.userId,
        user.tenantId,
      );
      where.id = { in: assignedPatientIds };
    }

    // 🔥 Advanced filtering logic
    if (includeDeleted) {
      // no filter → include all
    } else if (isDeleted !== undefined) {
      where.isDeleted = isDeleted;
    } else {
      where.isDeleted = false; // default
    }

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.patient.count({ where }),
    ]);

    return {
      data: await this.enrichPatients(
        data as PatientWithPregnancyStartDate[],
      ),
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async findOne(id: string, user: any) {
    if (user.role === 'DOCTOR') {
      const assignedPatientIds = await this.getAssignedPatientIdsForDoctor(
        user.userId,
        user.tenantId,
      );

      if (!assignedPatientIds.includes(id)) {
        throw new NotFoundException('Patient not found');
      }
    }

    const patient = await this.prisma.patient.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
        isDeleted: false,
      },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    return this.enrichPatient(patient as PatientWithPregnancyStartDate);
  }

  async update(id: string, dto: UpdatePatientDto, user: any) {
    // Step 1: Ensure patient belongs to tenant
    const existingPatient = await this.prisma.patient.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
        isDeleted: false,
      },
    });

    if (!existingPatient) {
      throw new NotFoundException('Patient not found');
    }

    // 🔐 Step 2: Remove restricted fields (VERY IMPORTANT)
    const {
      tenantId,
      createdBy,
      pregnancyStartDate,
      phone,
      ...safeData
    } = dto as UpdatePatientDto & { tenantId?: string; createdBy?: string };

    if (phone && existingPatient.userId) {
      const phoneTaken = await this.prisma.user.findFirst({
        where: {
          phone,
          NOT: { id: existingPatient.userId },
        },
      });

      if (phoneTaken) {
        throw new BadRequestException('Phone number already in use');
      }
    }

    const patient = await this.prisma.$transaction(async (tx) => {
      if (phone && existingPatient.userId) {
        const normalizedPhone = phone.replace(/\D/g, '');
        await tx.user.update({
          where: { id: existingPatient.userId },
          data: {
            phone,
            email: `${normalizedPhone}@patient.local`,
          },
        });
      }

      return tx.patient.update({
        where: { id },
        data: {
          ...safeData,
          ...(phone !== undefined && { phone }),
          ...(pregnancyStartDate !== undefined && {
            pregnancyStartDate: this.parsePregnancyStartDate(pregnancyStartDate),
          }),
        } as Prisma.PatientUpdateInput,
      });
    });

    return this.enrichPatient(patient as PatientWithPregnancyStartDate);
  }

  async remove(id: string, user: any) {
    const patient = await this.prisma.patient.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
        isDeleted: false,
      },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.doctorPatient.deleteMany({
        where: { patientId: id, tenantId: user.tenantId },
      });

      if (patient.userId) {
        await tx.user.update({
          where: { id: patient.userId },
          data: { status: EntityStatus.INACTIVE },
        });
      }

      return tx.patient.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });
    });
  }

  async restore(id: string, user: any) {
    const patient = await this.prisma.patient.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
        isDeleted: true, // 🔥 only deleted can be restored
      },
    });
  
    if (!patient) {
      throw new NotFoundException('Deleted patient not found');
    }
  
    return this.prisma.$transaction(async (tx) => {
      if (patient.userId) {
        await tx.user.update({
          where: { id: patient.userId },
          data: { status: EntityStatus.ACTIVE },
        });
      }

      return tx.patient.update({
        where: { id },
        data: {
          isDeleted: false,
          deletedAt: null,
        },
      });
    });
  }

  async getPregnancySummary(user: { userId: string; tenantId: string }) {
    const patient = (await this.prisma.patient.findFirst({
      where: {
        userId: user.userId,
        tenantId: user.tenantId,
        isDeleted: false,
      },
    })) as PatientWithPregnancyStartDate | null;

    if (!patient) {
      throw new NotFoundException('Patient profile not found');
    }

    const startDate = patient.pregnancyStartDate;
    if (!startDate) {
      throw new BadRequestException('Pregnancy start date not configured');
    }

    const week = calculatePregnancyWeek(startDate);

    return {
      pregnancyWeek: week,
      trimester: calculateTrimester(week),
      estimatedDueDate: calculateDueDate(startDate),
    };
  }
}