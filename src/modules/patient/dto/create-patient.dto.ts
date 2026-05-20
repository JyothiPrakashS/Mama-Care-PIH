import { IsDateString, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreatePatientDto {
  @IsString()
  name: string;

  @IsInt()
  age: number;

  @IsString()
  phone: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  medicalNote?: string;

  @IsOptional()
  @IsDateString()
  pregnancyStartDate?: string;
}