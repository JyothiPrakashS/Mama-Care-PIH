import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
@Injectable()
export class PatientService {
  constructor(private prisma: PrismaService) {}

  async create(createPatientDto: CreatePatientDto, user: any) {
    return this.prisma.patient.create({
      data: {
        ...createPatientDto,
        tenantId: user.tenantId,
        createdBy: user.userId,
      },
    });
  }

  async getPatients(user) {
    return this.prisma.user.findMany({
      where: {
        tenantId: user.tenantId, // 🔐 THIS IS TENANT ENFORCEMENT
        role: 'PATIENT',
      },
    });
  }
}