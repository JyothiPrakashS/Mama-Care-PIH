import { AssignProgramDto } from './dto/assign-program.dto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class PatientProgramService {
  constructor(private readonly prisma: PrismaService) {}

  async assignProgram(dto: AssignProgramDto, user: { tenantId?: string }) {
    if (!user?.tenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    const patient = await this.prisma.patient.findFirst({
      where: {
        id: dto.patientId,
        tenantId: user.tenantId,
        isDeleted: false,
      },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    const program = await this.prisma.careProgram.findUnique({
      where: {
        code: dto.programCode.trim().toUpperCase(),
      },
    });

    if (!program || !program.isActive) {
      throw new NotFoundException('Care program not found');
    }

    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    const endDate = dto.endDate ? new Date(dto.endDate) : null;

    return this.prisma.$transaction(async (tx) => {
      await tx.patientProgram.updateMany({
        where: {
          patientId: dto.patientId,
          programId: { not: program.id },
          isActive: true,
        },
        data: {
          isActive: false,
          endDate: new Date(),
        },
      });

      return tx.patientProgram.upsert({
        where: {
          patientId_programId: {
            patientId: dto.patientId,
            programId: program.id,
          },
        },
        create: {
          patientId: dto.patientId,
          programId: program.id,
          startDate,
          endDate,
          isActive: true,
        },
        update: {
          startDate,
          endDate,
          isActive: true,
        },
      });
    });
  }
}
