import { IsOptional, IsBooleanString, IsNumberString } from 'class-validator';

export class QueryTenantDto {
  @IsOptional()
  @IsBooleanString()
  isActive?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}