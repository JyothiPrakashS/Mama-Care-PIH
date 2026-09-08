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
import { ScheduleService } from './schedule.service';
import { CreateScheduleTemplateDto } from './dto/create-schedule-template.dto';
import { UpdateScheduleTemplateDto } from './dto/update-schedule-template.dto';
import { QueryScheduleTemplateDto } from './dto/query-schedule-template.dto';
import { CreateScheduleVersionDto } from './dto/create-schedule-version.dto';
import { UpdateScheduleVersionDto } from './dto/update-schedule-version.dto';
import {
  CreateScheduleRuleDto,
  UpdateScheduleRuleDto,
} from './dto/schedule-rule.dto';
import {
  CreateScheduleRuleItemDto,
  UpdateScheduleRuleItemDto,
} from './dto/schedule-rule-item.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'PLATFORM_ADMIN')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  // Templates
  @Post('schedule-templates')
  createTemplate(@Body() dto: CreateScheduleTemplateDto) {
    return this.scheduleService.createTemplate(dto);
  }

  @Get('schedule-templates')
  findTemplates(@Query() query: QueryScheduleTemplateDto) {
    return this.scheduleService.findTemplates(query);
  }

  @Get('schedule-templates/:id')
  findTemplate(@Param('id') id: string) {
    return this.scheduleService.findTemplate(id);
  }

  @Patch('schedule-templates/:id')
  updateTemplate(@Param('id') id: string, @Body() dto: UpdateScheduleTemplateDto) {
    return this.scheduleService.updateTemplate(id, dto);
  }

  // Versions
  @Post('schedule-templates/:templateId/versions')
  createVersion(
    @Param('templateId') templateId: string,
    @Body() dto: CreateScheduleVersionDto,
  ) {
    return this.scheduleService.createVersion(templateId, dto);
  }

  @Get('schedule-templates/:templateId/versions')
  findVersions(@Param('templateId') templateId: string) {
    return this.scheduleService.findVersions(templateId);
  }

  @Get('schedule-versions/:id')
  findVersion(@Param('id') id: string) {
    return this.scheduleService.findVersion(id);
  }

  @Patch('schedule-versions/:id')
  updateVersion(@Param('id') id: string, @Body() dto: UpdateScheduleVersionDto) {
    return this.scheduleService.updateVersion(id, dto);
  }

  @Post('schedule-versions/:id/publish')
  publishVersion(@Param('id') id: string) {
    return this.scheduleService.publishVersion(id);
  }

  @Post('schedule-versions/:id/retire')
  retireVersion(@Param('id') id: string) {
    return this.scheduleService.retireVersion(id);
  }

  // Rules
  @Post('schedule-versions/:versionId/rules')
  createRule(
    @Param('versionId') versionId: string,
    @Body() dto: CreateScheduleRuleDto,
  ) {
    return this.scheduleService.createRule(versionId, dto);
  }

  @Get('schedule-versions/:versionId/rules')
  findRules(@Param('versionId') versionId: string) {
    return this.scheduleService.findRules(versionId);
  }

  @Patch('schedule-rules/:id')
  updateRule(@Param('id') id: string, @Body() dto: UpdateScheduleRuleDto) {
    return this.scheduleService.updateRule(id, dto);
  }

  @Delete('schedule-rules/:id')
  deleteRule(@Param('id') id: string) {
    return this.scheduleService.deleteRule(id);
  }

  // Rule items
  @Post('schedule-rules/:ruleId/items')
  createRuleItem(
    @Param('ruleId') ruleId: string,
    @Body() dto: CreateScheduleRuleItemDto,
  ) {
    return this.scheduleService.createRuleItem(ruleId, dto);
  }

  @Get('schedule-rules/:ruleId/items')
  findRuleItems(@Param('ruleId') ruleId: string) {
    return this.scheduleService.findRuleItems(ruleId);
  }

  @Patch('schedule-rule-items/:id')
  updateRuleItem(
    @Param('id') id: string,
    @Body() dto: UpdateScheduleRuleItemDto,
  ) {
    return this.scheduleService.updateRuleItem(id, dto);
  }

  @Delete('schedule-rule-items/:id')
  deleteRuleItem(@Param('id') id: string) {
    return this.scheduleService.deleteRuleItem(id);
  }
}
