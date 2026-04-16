import { Module } from '@nestjs/common';
import { DoctorPatientController } from './doctor-patient.controller';
import { DoctorPatientService } from './doctor-patient.service';

@Module({
  controllers: [DoctorPatientController],
  providers: [DoctorPatientService],
})
export class DoctorPatientModule {}