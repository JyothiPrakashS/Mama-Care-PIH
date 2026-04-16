import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AssignDoctorDto } from './dto/assign-doctor.dto';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class DoctorPatientService {
  constructor(private prisma: PrismaService) {}

  async assignDoctor(dto: AssignDoctorDto, user: { tenantId?: string }) {
    const { doctorId, patientId } = dto;

    if (!user?.tenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    // 🔹 Validate doctor
    const doctor = await this.prisma.user.findFirst({
      where: {
        id: doctorId,
        role: 'DOCTOR',
        tenantId: user.tenantId,
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

    try {
      // 🔹 Create mapping
      return await this.prisma.doctorPatient.create({
        data: {
          doctorId,
          patientId,
          tenantId: user.tenantId,
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
}