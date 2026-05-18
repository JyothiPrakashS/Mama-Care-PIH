import { CreateDoctorDto } from "./dto/create-doctor.dto";
import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/common/guards/jwt.guard";
import { RolesGuard } from "src/common/guards/roles.guard";
import { Roles } from "src/common/decorators/roles.decorator";
import { DoctorService } from "./doctor.service";
import { UpdateDoctorStatusDto } from "./dto/update-doctor-status.dto";

@Controller('doctor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PLATFORM_ADMIN')
export class DoctorController {
  constructor(private readonly doctorService: DoctorService) {}

  @Post()
  createDoctor(@Body() dto: CreateDoctorDto, @Req() req) {
    return this.doctorService.createDoctor(dto, req.user.tenantId);
  }

  @Get()
  getDoctors(@Req() req) {
    return this.doctorService.getDoctors(req.user.tenantId);
  }

  @Patch(':id/status')
  updateDoctorStatus(@Param('id') id: string, @Body() dto: UpdateDoctorStatusDto | undefined, @Req() req) {
    if (!dto?.status) {
      throw new BadRequestException('Status is required');
    }

    return this.doctorService.updateDoctorStatus(id, dto.status, req.user.tenantId);
  }
}