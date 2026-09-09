import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { TenantScheduleService } from './tenant-schedule.service';
import { AdoptScheduleVersionDto } from './dto/adopt-schedule-version.dto';
import { QueryTenantScheduleAdoptionDto } from './dto/query-tenant-schedule-adoption.dto';
import {
  AssignPatientScheduleDto,
  MigratePatientScheduleDto,
} from './dto/assign-patient-schedule.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class TenantScheduleController {
  constructor(private readonly tenantScheduleService: TenantScheduleService) {}

  @Post('tenant-schedule-adoptions')
  @Roles('SUPER_ADMIN', 'PLATFORM_ADMIN')
  adopt(@Body() dto: AdoptScheduleVersionDto, @CurrentUser() user: any) {
    return this.tenantScheduleService.adopt(dto, user);
  }

  @Get('tenant-schedule-adoptions')
  @Roles('SUPER_ADMIN', 'PLATFORM_ADMIN')
  listAdoptions(
    @Query() query: QueryTenantScheduleAdoptionDto,
    @CurrentUser() user: any,
  ) {
    return this.tenantScheduleService.listAdoptions(query, user);
  }

  @Get('tenant-schedule-adoptions/:id')
  @Roles('SUPER_ADMIN', 'PLATFORM_ADMIN')
  getAdoption(@Param('id') id: string, @CurrentUser() user: any) {
    return this.tenantScheduleService.getAdoption(id, user);
  }

  @Post('tenant-schedule-adoptions/:id/revoke')
  @Roles('SUPER_ADMIN', 'PLATFORM_ADMIN')
  revokeAdoption(@Param('id') id: string, @CurrentUser() user: any) {
    return this.tenantScheduleService.revokeAdoption(id, user);
  }

  @Post('patient-programs/:patientProgramId/schedule-assignments')
  @Roles('SUPER_ADMIN', 'PLATFORM_ADMIN')
  assign(
    @Param('patientProgramId') patientProgramId: string,
    @Body() dto: AssignPatientScheduleDto,
    @CurrentUser() user: any,
  ) {
    return this.tenantScheduleService.assignToPatientProgram(
      patientProgramId,
      dto,
      user,
    );
  }

  @Get('patient-programs/:patientProgramId/schedule-assignments')
  @Roles('SUPER_ADMIN', 'PLATFORM_ADMIN')
  listAssignments(
    @Param('patientProgramId') patientProgramId: string,
    @CurrentUser() user: any,
  ) {
    return this.tenantScheduleService.listAssignments(patientProgramId, user);
  }

  @Get('patient-programs/:patientProgramId/schedule-assignments/current')
  @Roles('SUPER_ADMIN', 'PLATFORM_ADMIN')
  getCurrentAssignment(
    @Param('patientProgramId') patientProgramId: string,
    @CurrentUser() user: any,
  ) {
    return this.tenantScheduleService.getCurrentAssignment(
      patientProgramId,
      user,
    );
  }

  @Post('patient-programs/:patientProgramId/schedule-assignments/migrate')
  @Roles('SUPER_ADMIN', 'PLATFORM_ADMIN')
  migrate(
    @Param('patientProgramId') patientProgramId: string,
    @Body() dto: MigratePatientScheduleDto,
    @CurrentUser() user: any,
  ) {
    return this.tenantScheduleService.migrateAssignment(
      patientProgramId,
      dto,
      user,
    );
  }
}
