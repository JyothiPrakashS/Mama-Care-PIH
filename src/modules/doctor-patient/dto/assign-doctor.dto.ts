import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class AssignDoctorDto {
    @IsString()
    @IsNotEmpty()
    patientId: string;

    @IsString()
    @IsNotEmpty()
    doctorId: string;
  }