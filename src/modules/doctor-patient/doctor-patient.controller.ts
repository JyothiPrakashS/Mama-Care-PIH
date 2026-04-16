import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AssignDoctorDto } from './dto/assign-doctor.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { DoctorPatientService } from './doctor-patient.service';

@Controller('doctor-patient')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DoctorPatientController {
  constructor(private readonly doctorPatientService: DoctorPatientService) {}

  @Post('assign')
  @Roles('PLATFORM_ADMIN')
  async assignDoctor(@Body() dto: AssignDoctorDto, @Req() req) {
    return this.doctorPatientService.assignDoctor(dto, req.user);
  }

  @Get('my-patients')
  @Roles('DOCTOR')
  async getMyPatients(@Req() req) {
    return this.doctorPatientService.getMyPatients(req.user);
  }
}