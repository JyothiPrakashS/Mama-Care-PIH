import { EntityStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateDoctorStatusDto {
  @IsNotEmpty()
  @IsEnum(EntityStatus)
  status: EntityStatus;
}
