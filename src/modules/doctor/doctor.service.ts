import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CreateDoctorDto } from "./dto/create-doctor.dto";
import { PrismaService } from "src/common/prisma/prisma.service";
import { EntityStatus } from "@prisma/client";

@Injectable()
export class DoctorService {
  constructor(private readonly prisma: PrismaService) {}

  async createDoctor(dto: CreateDoctorDto, tenantId: string) {
  const existing = await this.prisma.user.findUnique({
    where: { phone: dto.phone },
  });

  if (existing) {
    throw new BadRequestException('User already exists with this phone');
  }

  const tempPassword = 'Doctor@123'; // later: generate securely

  // TEMPORARY FOR TESTING ONLY:
  // Store plain-text password so login works with auth.service QA mode.
  // Re-enable bcrypt before moving to production.
  return this.prisma.user.create({
    data: {
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      password: tempPassword,
      role: 'DOCTOR',
      tenantId,
      status: EntityStatus.ACTIVE,
      mustChangePassword: true,
    },
  });
}

async getDoctors(tenantId: string) {
  const doctors = await this.prisma.user.findMany({
    where: {
      tenantId,
      role: 'DOCTOR',
    },
    include: {
        doctorPatients: {
            include: {
                patient: true,
            },
        },
    },
  });

  return doctors.map(doc => ({
    id: doc.id,
    name: doc.name,
    email: doc.email,
    phone: doc.phone,
    status: doc.status,
    createdAt: doc.createdAt,
    doctorPatients: doc.doctorPatients
      .filter((dp) => !dp.patient.isDeleted)
      .map(dp => ({
      id: dp.id,
      patientId: dp.patientId,
      isPrimary: dp.isPrimary,
    })),
  }));
}

async updateDoctorStatus(doctorId: string, status: EntityStatus, tenantId: string) {
  const doctor = await this.prisma.user.findFirst({
    where: {
      id: doctorId,
      tenantId,
      role: 'DOCTOR',
    },
  });

  if (!doctor) {
    throw new NotFoundException('Doctor not found');
  }

  if (status === EntityStatus.INACTIVE || status === EntityStatus.SUSPENDED) {
    await this.prisma.doctorPatient.deleteMany({
      where: { doctorId, tenantId },
    });
  }

  return this.prisma.user.update({
    where: { id: doctorId },
    data: { status },
  });
}
}
