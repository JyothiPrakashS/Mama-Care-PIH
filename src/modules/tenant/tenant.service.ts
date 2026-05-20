import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { generateInviteCode } from 'src/common/utils/invite-code.util';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { QueryTenantDto } from './dto/query-tenant.dto';
import { EntityStatus } from '@prisma/client';

@Injectable()
export class TenantService {
  constructor(private prisma: PrismaService) {}

  async createTenant(dto: CreateTenantDto) {
    const { tenantName, adminPhone, password } = dto;

    const existingTenant = await this.prisma.tenant.findFirst({
      where: { name: {
        equals: tenantName,
        mode: 'insensitive',
      }, },
    });
    if (existingTenant) {
      throw new BadRequestException('Tenant with this name already exists');
    }
    
    const existingUser = await this.prisma.user.findUnique({
      where: { phone: adminPhone },
    });
    if (existingUser) {
      throw new BadRequestException('User with this phone number already exists');
    }

    const plainPasswordForTesting = password;

    const inviteCode = generateInviteCode(tenantName);

    const existingInviteCode = await this.prisma.tenant.findFirst({
      where: { inviteCode },
    });
    if (existingInviteCode) {
      throw new BadRequestException('Invite code already exists');
    }

    // Transaction (very important)
    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: tenantName,
          inviteCode,
          code: inviteCode,
          type: 'hospital',
        },
      });

      const adminUser = await tx.user.create({
        data: {
          phone: adminPhone,
          password: plainPasswordForTesting,
          role: 'PLATFORM_ADMIN',
          tenantId: tenant.id,
          email: `${adminPhone}@tenant.local`,
          mustChangePassword: true,
        },
      });

      return {
        tenant,
        adminUser,
      };
    });

    return result;
  }

  async restoreTenant(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    });
  
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
  
    return this.prisma.tenant.update({
      where: { id },
      data: {
        status: EntityStatus.ACTIVE,
        deletedAt: null,
      },
    });
  }

  async findAllTenants(query: QueryTenantDto) {
    const { status, page = '1', limit = '10' } = query;
    const pageNum = Number.parseInt(String(page), 10) || 1;
    const limitNum = Number.parseInt(String(limit), 10) || 10;
    const skip = (pageNum - 1) * limitNum;
  
    const where: any = {};
  
    if (status !== undefined) {
      where.status = status;
    }
  
    const [data, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tenant.count({ where }),
    ]);
  
    return {
      data,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async regenerateTenantInviteCode(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    });
  
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
  
    const newCode = generateInviteCode(tenant.name);
  
    return this.prisma.tenant.update({
      where: { id },
      data: {
        inviteCode: newCode,
        code: newCode,
      },
    });
  }

  async deactivateTenant(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    });
  
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
  
    return this.prisma.tenant.update({
      where: { id },
      data: {
        status: EntityStatus.INACTIVE,
        deletedAt: new Date(),
      },
    });
  }
}