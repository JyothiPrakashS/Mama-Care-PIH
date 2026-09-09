import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PatientModule } from './modules/patient/patient.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { DoctorPatientModule } from './modules/doctor-patient/doctor-patient.module';
import { DoctorModule } from './modules/doctor/doctor.module';
import { PatientProgramModule } from './modules/patient-program/patient-program.module';
import { CareProgramModule } from './modules/care-program/care-program.module';
import { ActivityModule } from './modules/activity/activity.module';
import { ContentModule } from './modules/content/content.module';
import { ScheduleModule } from './modules/schedule/schedule.module';
import { TenantScheduleModule } from './modules/tenant-schedule/tenant-schedule.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    PatientModule,
    TenantModule,
    DoctorPatientModule,
    DoctorModule,
    PatientProgramModule,
    CareProgramModule,
    ActivityModule,
    ContentModule,
    ScheduleModule,
    TenantScheduleModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}