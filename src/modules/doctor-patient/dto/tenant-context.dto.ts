import { IsOptional, IsString } from 'class-validator';

export class TenantContextDto {
  @IsString()
  @IsOptional()
  tenantId?: string;
}
