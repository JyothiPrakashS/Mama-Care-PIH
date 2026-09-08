import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
} from 'class-validator';
import { ActivityType } from '@prisma/client';

export class UpdateActivityDto {
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9_]+$/, {
    message: 'code must contain only letters, numbers, and underscores',
  })
  code?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsEnum(ActivityType)
  type?: ActivityType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsString()
  quickNote?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedMinutes?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
