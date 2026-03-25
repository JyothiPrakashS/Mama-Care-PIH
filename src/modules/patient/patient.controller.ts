import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PatientService } from './patient.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@Controller('patients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PatientController {
  constructor(private readonly patientService: PatientService) { }

  @Post()
  @Roles('DOCTOR', 'PLATFORM_ADMIN')
  create(@Body() dto: CreatePatientDto, @Req() req) {
    return this.patientService.create(dto, req.user);
  }

  @Get()
  @Roles('DOCTOR', 'PLATFORM_ADMIN')
  getPatients(@CurrentUser() user) {
    return this.patientService.getPatients(user);
  }
}
