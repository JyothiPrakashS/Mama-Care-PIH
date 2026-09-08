import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { ContentType } from '@prisma/client';

export class CreateContentDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_]+$/, {
    message: 'code must contain only letters, numbers, and underscores',
  })
  code: string;

  @IsString()
  @MinLength(2)
  title: string;

  @IsEnum(ContentType)
  type: ContentType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  storageKey?: string;

  @IsOptional()
  @IsString()
  contentUrl?: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;
}
