import { IsNotEmpty, IsString } from 'class-validator';

export class DoctorPatientPairDto {
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @IsString()
  @IsNotEmpty()
  doctorId: string;
}
