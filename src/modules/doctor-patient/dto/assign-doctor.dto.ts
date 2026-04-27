import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { DoctorPatientPairDto } from './doctor-patient-pair.dto';

export class AssignDoctorDto extends DoctorPatientPairDto {
  @IsString()
  @IsOptional()
  tenantId?: string;

  @IsBoolean()
  @IsOptional()
  isPrimary = false;
}