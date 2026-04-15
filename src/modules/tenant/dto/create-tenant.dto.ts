import { IsString, MinLength } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  tenantName: string;

  @IsString()
  adminPhone: string;

  @IsString()
  @MinLength(6)
  password: string;
}