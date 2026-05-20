import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AssignDoctorDto } from './dto/assign-doctor.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { DoctorPatientService } from './doctor-patient.service';
import { ReassignDoctorDto } from './dto/reassign-doctor.dto';
import { Patient, User } from '@prisma/client';
import { SetPrimaryDoctorDto } from './dto/set-primary-doctor.dto';

type DoctorSummary = Pick<User, 'id' | 'email' | 'phone' | 'status' | 'createdAt'>;

@Controller('doctor-patient')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DoctorPatientController {
  constructor(private readonly doctorPatientService: DoctorPatientService) { }

  @Post('assign')
  @Roles('PLATFORM_ADMIN')
  async assignDoctor(@Body() dto: AssignDoctorDto, @Req() req) {
    return this.doctorPatientService.assignDoctor(dto, req.user);
  }

  @Delete('unassign')
  @Roles('PLATFORM_ADMIN')
  async unassignDoctor(@Body() dto: AssignDoctorDto, @Req() req) {
    return this.doctorPatientService.unassignDoctor(
      dto.doctorId,
      dto.patientId,
      req.user.tenantId,
    );
  }

  @Post('reassign')
  @Roles('PLATFORM_ADMIN')
  async reassignDoctor(@Body() dto: ReassignDoctorDto, @Req() req) {
    return this.doctorPatientService.reassignDoctor(
      dto.oldDoctorId,
      dto.newDoctorId,
      dto.patientId,
      req.user.tenantId,
    );
  }

  @Post('set-primary')
  @Roles('PLATFORM_ADMIN')
  async setPrimaryDoctor(@Body() dto: SetPrimaryDoctorDto, @Req() req) {
    return this.doctorPatientService.setPrimaryDoctor(dto, req.user.tenantId);
  }

  @Get('my-patients')
  @Roles('DOCTOR')
  async getMyPatients(@Req() req): Promise<Patient[] | null> {
    return this.doctorPatientService.getMyPatients(req.user as { userId?: string; tenantId?: string });
  }

  @Get('patient/:patientId')
  @Roles('PLATFORM_ADMIN')
  async getDoctorsForPatient(@Param('patientId') patientId: string, @Req() req): Promise<{ primaryDoctor: DoctorSummary | null; otherDoctors: DoctorSummary[] }> {
    return this.doctorPatientService.getDoctorsForPatient(patientId, (req.user as { tenantId?: string }).tenantId || '' as string);
  }

  @Get('patients/my/doctors')
  @Roles('PATIENT')
  async getMyDoctors(@Req() req): Promise<{ primaryDoctor: DoctorSummary | null; otherDoctors: DoctorSummary[] }> {
    return this.doctorPatientService.getMyDoctors(req.user);
  }
}
