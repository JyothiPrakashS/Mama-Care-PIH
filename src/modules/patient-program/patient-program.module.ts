import { Module } from '@nestjs/common';
import { PatientProgramController } from './patient-program.controller';
import { PatientProgramService } from './patient-program.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@Module({
  controllers: [PatientProgramController],
  providers: [PatientProgramService, PrismaService],
  exports: [PatientProgramService],
})
export class PatientProgramModule {}
