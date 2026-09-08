import { IsBoolean, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class UpdateScheduleTemplateDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9_]+$/, {
    message: 'code must contain only letters, numbers, and underscores',
  })
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
