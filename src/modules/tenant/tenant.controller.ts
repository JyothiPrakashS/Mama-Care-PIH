import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { QueryTenantDto } from './dto/query-tenant.dto';

@Controller('tenant')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TenantController {
  constructor(private readonly tenantService: TenantService) { }

  @Post()
  @Roles('SUPER_ADMIN') // Only super admin can create a tenant
  createTenant(@Body() dto: CreateTenantDto) {
    return this.tenantService.createTenant(dto);
  }

  @Patch(':id/restore')
  @Roles('SUPER_ADMIN')
  restoreTenant(@Param('id') id: string) {
    return this.tenantService.restoreTenant(id);
  }

  @Get()
  @Roles('SUPER_ADMIN')
  findAllTenants(@Query() query: QueryTenantDto) {
    return this.tenantService.findAllTenants(query);
  }

  @Patch(':id/regenerate-invite-code')
  @Roles('SUPER_ADMIN')
  regenerateTenantInviteCode(@Param('id') id: string) {
    return this.tenantService.regenerateTenantInviteCode(id);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  removeTenant(@Param('id') id: string) {
    return this.tenantService.deactivateTenant(id);
  }
}