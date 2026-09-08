import {
  Body,
  Controller,
  Delete,
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
import { ActivityService } from './activity.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { QueryActivityDto } from './dto/query-activity.dto';
import { AttachContentDto } from './dto/attach-content.dto';

@Controller('activities')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'PLATFORM_ADMIN')
  create(@Body() dto: CreateActivityDto) {
    return this.activityService.create(dto);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'PLATFORM_ADMIN')
  findAll(@Query() query: QueryActivityDto) {
    return this.activityService.findAll(query);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'PLATFORM_ADMIN')
  findOne(@Param('id') id: string) {
    return this.activityService.findOne(id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'PLATFORM_ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateActivityDto) {
    return this.activityService.update(id, dto);
  }

  @Post(':id/content')
  @Roles('SUPER_ADMIN', 'PLATFORM_ADMIN')
  attachContent(@Param('id') id: string, @Body() dto: AttachContentDto) {
    return this.activityService.attachContent(id, dto);
  }

  @Get(':id/content')
  @Roles('SUPER_ADMIN', 'PLATFORM_ADMIN')
  listContent(@Param('id') id: string) {
    return this.activityService.listContent(id);
  }

  @Delete(':id/content/:contentId')
  @Roles('SUPER_ADMIN', 'PLATFORM_ADMIN')
  detachContent(
    @Param('id') id: string,
    @Param('contentId') contentId: string,
  ) {
    return this.activityService.detachContent(id, contentId);
  }
}
