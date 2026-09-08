import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateScheduleVersionDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  versionNumber?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
