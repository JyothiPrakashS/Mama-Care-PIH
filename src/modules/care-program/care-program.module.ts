import { Module } from '@nestjs/common';
import { CareProgramController } from './care-program.controller';
import { CareProgramService } from './care-program.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@Module({
  controllers: [CareProgramController],
  providers: [CareProgramService, PrismaService],
  exports: [CareProgramService],
})
export class CareProgramModule {}
