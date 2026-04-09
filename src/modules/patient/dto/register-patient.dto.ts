import { IsString, MinLength } from 'class-validator';

export class RegisterPatientDto {
  @IsString()
  name: string;

  @IsString()
  phone: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  inviteCode: string;
}