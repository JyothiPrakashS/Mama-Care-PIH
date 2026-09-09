import { IsOptional, IsUUID } from 'class-validator';

export class AdoptScheduleVersionDto {
  @IsUUID()
  scheduleVersionId: string;

  /** Required for SUPER_ADMIN only. Ignored for PLATFORM_ADMIN (uses JWT tenantId). */
  @IsOptional()
  @IsUUID()
  tenantId?: string;
}
