import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { PatientService } from './patient.service';

@Controller('patients')
export class PatientController {
  constructor(private patientService: PatientService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  getPatients(@CurrentUser() user) {
    return this.patientService.getPatients(user);
  }
}