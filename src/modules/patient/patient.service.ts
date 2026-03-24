import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class PatientService {
  constructor(private prisma: PrismaService) {}

  async getPatients(user) {
    return this.prisma.user.findMany({
      where: {
        tenantId: user.tenantId, // 🔐 THIS IS TENANT ENFORCEMENT
        role: 'PATIENT',
      },
    });
  }
}