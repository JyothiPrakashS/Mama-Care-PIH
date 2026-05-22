import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/common/guards/jwt.guard";
import { RolesGuard } from "src/common/guards/roles.guard";
import { Roles } from "src/common/decorators/roles.decorator";
import { PatientProgramService } from "./patient-program.service";
import { AssignProgramDto } from "./dto/assign-program.dto";

@Controller('patient-programs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PLATFORM_ADMIN')
export class PatientProgramController {
  constructor(private readonly patientProgramService: PatientProgramService) {}

  @Post('assign')
  assignProgram(@Body() dto: AssignProgramDto, @Req() req) {
    return this.patientProgramService.assignProgram(dto, req.user);
  }
}