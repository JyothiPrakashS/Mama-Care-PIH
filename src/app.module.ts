import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PatientModule } from './modules/patient/patient.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { DoctorPatientModule } from './modules/doctor-patient/doctor-patient.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    PatientModule,
    TenantModule,
    DoctorPatientModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}