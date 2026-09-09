import { Module } from '@nestjs/common';
import { TenantScheduleController } from './tenant-schedule.controller';
import { TenantScheduleService } from './tenant-schedule.service';

@Module({
  controllers: [TenantScheduleController],
  providers: [TenantScheduleService],
  exports: [TenantScheduleService],
})
export class TenantScheduleModule {}
