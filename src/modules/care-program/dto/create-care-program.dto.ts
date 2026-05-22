import { IsBoolean, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateCareProgramDto {
  @IsString()
  @MinLength(3)
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
  isPaid?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
