import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateScheduleRuleItemDto {
  @IsUUID()
  activityId: string;

  @IsInt()
  @Min(1)
  position: number;
}

export class UpdateScheduleRuleItemDto {
  @IsOptional()
  @IsUUID()
  activityId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  position?: number;
}
