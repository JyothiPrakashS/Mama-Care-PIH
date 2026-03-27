import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Query,
  UseGuards,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';
import { PatientService } from './patient.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { QueryPatientDto } from './dto/query-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

@Controller('patients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PatientController {
  constructor(private readonly patientService: PatientService) { }

  @Post('patient')
  @Roles('DOCTOR', 'PLATFORM_ADMIN')
  create(@Body() dto: CreatePatientDto, @Req() req) {
    return this.patientService.create(dto, req.user);
  }

  @Get()
  @Roles('DOCTOR', 'PLATFORM_ADMIN')
  findAll(@Query() query: QueryPatientDto, @Req() req) {
    return this.patientService.findAll(query, req.user);
  }

  @Get(':id')
  @Roles('DOCTOR', 'PLATFORM_ADMIN')
  findOne(@Param('id') id: string, @Req() req) {
    return this.patientService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles('DOCTOR', 'PLATFORM_ADMIN')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePatientDto,
    @Req() req,
  ) {
    return this.patientService.update(id, dto, req.user);
  }

  @Delete(':id')
  @Roles('PLATFORM_ADMIN') // 🔥 Only admin can delete
  remove(@Param('id') id: string, @Req() req) {
    return this.patientService.remove(id, req.user);
  }

  @Patch(':id/restore')
  @Roles('PLATFORM_ADMIN')
  restore(@Param('id') id: string, @Req() req) {
    return this.patientService.restore(id, req.user);
  }
}
