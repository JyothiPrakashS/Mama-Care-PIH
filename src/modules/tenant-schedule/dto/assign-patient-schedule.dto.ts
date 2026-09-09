import { IsUUID } from 'class-validator';

export class AssignPatientScheduleDto {
  @IsUUID()
  scheduleVersionId: string;
}

export class MigratePatientScheduleDto {
  @IsUUID()
  scheduleVersionId: string;
}
