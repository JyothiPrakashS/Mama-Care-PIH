import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { ScheduleRuleType } from '@prisma/client';

export class CreateScheduleRuleDto {
  @IsInt()
  @Min(1)
  startInterventionDay: number;

  @IsInt()
  @Min(1)
  endInterventionDay: number;

  @IsEnum(ScheduleRuleType)
  ruleType: ScheduleRuleType;
}

export class UpdateScheduleRuleDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  startInterventionDay?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  endInterventionDay?: number;

  @IsOptional()
  @IsEnum(ScheduleRuleType)
  ruleType?: ScheduleRuleType;
}
