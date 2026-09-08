import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateScheduleTemplateDto {
  @IsUUID()
  careProgramId: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @Matches(/^[A-Za-z0-9_]+$/, {
    message: 'code must contain only letters, numbers, and underscores',
  })
  code: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
