import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EntityStatus, Prisma, User } from '@prisma/client';
import { AssignDoctorDto } from './dto/assign-doctor.dto';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { SetPrimaryDoctorDto } from './dto/set-primary-doctor.dto';

type DoctorSummary = Pick<User, 'id' | 'email' | 'phone' | 'status' | 'createdAt'>;

@Injectable()
export class DoctorPatientService {
  constructor(private prisma: PrismaService) { }

  async assignDoctor(dto: AssignDoctorDto, user: { tenantId?: string }) {
    const { doctorId, patientId, isPrimary } = dto;

    if (!user?.tenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    // 🔹 Validate doctor
    const doctor = await this.prisma.user.findFirst({
      where: {
        id: doctorId,
        role: 'DOCTOR',
        tenantId: user.tenantId,
        status: EntityStatus.ACTIVE,
      },
    });

    if (!doctor) {
      throw new BadRequestException('Invalid doctor');
    }

    // 🔹 Validate patient
    const patient = await this.prisma.patient.findFirst({
      where: {
        id: patientId,
        tenantId: user.tenantId,
        isDeleted: false,
      },
    });

    if (!patient) {
      throw new BadRequestException('Invalid patient');
    }

    // 🔹 Update existing primary mapping to false if isPrimary is true
    if (isPrimary) {
      await this.prisma.doctorPatient.updateMany({
        where: { patientId, tenantId: user.tenantId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    try {
      // 🔹 Create mapping
      return await this.prisma.doctorPatient.create({
        data: {
          doctorId,
          patientId,
          tenantId: user.tenantId,
          isPrimary: !!isPrimary,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('Doctor is already assigned to this patient');
      }
      throw error;
    }
  }

  async unassignDoctor(doctorId: string, patientId: string, tenantId: string) {
    const mapping = await this.prisma.doctorPatient.findFirst({
      where: { doctorId, patientId, tenantId },
    });

    if (!mapping) {
      throw new NotFoundException('Doctor-patient mapping not found');
    }

    await this.prisma.doctorPatient.delete({
      where: { id: mapping.id },
    });

    return { message: 'Doctor unassigned successfully' };
  }

  async reassignDoctor(
    oldDoctorId: string,
    newDoctorId: string,
    patientId: string,
    tenantId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const newDoctor = await tx.user.findFirst({
        where: {
          id: newDoctorId,
          role: 'DOCTOR',
          tenantId,
          status: EntityStatus.ACTIVE,
        },
      });

      if (!newDoctor) {
        throw new BadRequestException('Invalid new doctor');
      }

      const oldMapping = await tx.doctorPatient.findFirst({
        where: { doctorId: oldDoctorId, patientId, tenantId },
        select: { id: true, isPrimary: true } as const, // eslint-disable-line @typescript-eslint/consistent-type-assertions
      });

      if (!oldMapping) {
        throw new NotFoundException('Doctor-patient mapping not found');
      }

      // Remove old mapping
      await tx.doctorPatient.delete({
        where: {
          id: oldMapping.id,
        },
      });

      if (oldMapping.isPrimary) {
        await tx.doctorPatient.updateMany({
          where: { patientId, tenantId, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      // Add new mapping
      try {
        return await tx.doctorPatient.create({
          data: {
            doctorId: newDoctorId,
            patientId,
            tenantId,
            isPrimary: oldMapping.isPrimary,
          },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new BadRequestException(
            'New doctor is already assigned to this patient',
          );
        }
        throw error;
      }
    });
  }

  async setPrimaryDoctor(dto: SetPrimaryDoctorDto, tenantId: string) {
    const { doctorId, patientId } = dto;

    return this.prisma.$transaction(async (tx) => {

      // Check mapping exists
      const mapping = await tx.doctorPatient.findFirst({
        where: { doctorId, patientId, tenantId },
      });

      if (!mapping) {
        throw new NotFoundException('Doctor not assigned to patient');
      }

      // Unset existing primary
      await tx.doctorPatient.updateMany({
        where: { patientId, tenantId },
        data: { isPrimary: false },
      });

      // Set new primary
      return tx.doctorPatient.update({
        where: { id: mapping.id },
        data: { isPrimary: true },
      });
    });
  }

  async getMyPatients(user: { userId?: string; tenantId?: string }) {
    if (!user?.tenantId || !user?.userId) {
      throw new BadRequestException('User context is required');
    }

    const mappings = await this.prisma.doctorPatient.findMany({
      where: {
        tenantId: user.tenantId,
        doctorId: user.userId,
      },
      include: {
        patient: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return mappings
      .map((mapping) => mapping.patient)
      .filter((patient) => !patient.isDeleted);
  }

  async getDoctorsForPatient(
    patientId: string,
    tenantId: string,
  ): Promise<{ primaryDoctor: DoctorSummary | null; otherDoctors: DoctorSummary[] }> {
    const mappings = await this.prisma.doctorPatient.findMany({
      where: { patientId, tenantId },
      select: { doctorId: true, isPrimary: true } as const, // eslint-disable-line @typescript-eslint/consistent-type-assertions
    });

    const doctors = await this.prisma.user.findMany({
      where: {
        id: { in: mappings.map((mapping) => mapping.doctorId) } as const, // eslint-disable-line @typescript-eslint/consistent-type-assertions
        tenantId,
        role: 'DOCTOR',
        status: EntityStatus.ACTIVE,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
      } as const, // eslint-disable-line @typescript-eslint/consistent-type-assertions
    });

    const doctorsById = new Map(doctors.map((doctor) => [doctor.id, doctor]));
    const primaryDoctorId = mappings.find((mapping) => mapping.isPrimary)?.doctorId ?? null;
    const primaryDoctor = primaryDoctorId ? doctorsById.get(primaryDoctorId) ?? null : null;
    const otherDoctors = mappings
      .filter((mapping) => !mapping.isPrimary)
      .map((mapping) => doctorsById.get(mapping.doctorId))
      .filter((doctor): doctor is DoctorSummary => Boolean(doctor));

    return {
      primaryDoctor,
      otherDoctors,
    };
  }
}