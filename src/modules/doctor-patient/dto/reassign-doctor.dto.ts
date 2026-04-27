import { IsNotEmpty, IsString } from 'class-validator';
import { TenantContextDto } from './tenant-context.dto';

export class ReassignDoctorDto extends TenantContextDto {
  @IsString()
  @IsNotEmpty()
  oldDoctorId: string;

  @IsString()
  @IsNotEmpty()
  patientId: string;

  @IsString()
  @IsNotEmpty()
  newDoctorId: string;
}