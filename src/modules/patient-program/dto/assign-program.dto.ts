import { IsDateString, IsOptional, IsString } from 'class-validator';

export class AssignProgramDto {
  @IsString()
  patientId: string;

  @IsString()
  programCode: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
