import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CareProgramService } from './care-program.service';
import { CreateCareProgramDto } from './dto/create-care-program.dto';
import { UpdateCareProgramDto } from './dto/update-care-program.dto';
import { QueryCareProgramDto } from './dto/query-care-program.dto';

@Controller('care-programs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CareProgramController {
  constructor(private readonly careProgramService: CareProgramService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'PLATFORM_ADMIN', 'DOCTOR', 'NURSE')
  findAll(@Query() query: QueryCareProgramDto) {
    return this.careProgramService.findAll(query);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'PLATFORM_ADMIN', 'DOCTOR', 'NURSE')
  findOne(@Param('id') id: string) {
    return this.careProgramService.findOne(id);
  }

  @Post()
  @Roles('SUPER_ADMIN')
  create(@Body() dto: CreateCareProgramDto) {
    return this.careProgramService.create(dto);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateCareProgramDto) {
    return this.careProgramService.update(id, dto);
  }
}
