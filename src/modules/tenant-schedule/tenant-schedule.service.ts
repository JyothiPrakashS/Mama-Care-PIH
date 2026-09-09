import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ScheduleVersionStatus } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { AdoptScheduleVersionDto } from './dto/adopt-schedule-version.dto';
import { QueryTenantScheduleAdoptionDto } from './dto/query-tenant-schedule-adoption.dto';
import {
  AssignPatientScheduleDto,
  MigratePatientScheduleDto,
} from './dto/assign-patient-schedule.dto';

type AuthUser = {
  userId: string;
  role: string;
  tenantId?: string | null;
};

@Injectable()
export class TenantScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  private resolveTenantId(user: AuthUser, requestedTenantId?: string): string {
    if (user.role === 'PLATFORM_ADMIN') {
      if (!user.tenantId) {
        throw new BadRequestException('Tenant context is required');
      }
      if (requestedTenantId && requestedTenantId !== user.tenantId) {
        throw new ForbiddenException(
          'Cannot perform schedule operations for another tenant',
        );
      }
      return user.tenantId;
    }

    if (user.role === 'SUPER_ADMIN') {
      if (!requestedTenantId) {
        throw new BadRequestException(
          'tenantId is required for SUPER_ADMIN operations',
        );
      }
      return requestedTenantId;
    }

    throw new ForbiddenException('Insufficient permissions');
  }

  private adoptionInclude = {
    scheduleVersion: {
      select: {
        id: true,
        versionNumber: true,
        status: true,
        name: true,
        description: true,
        publishedAt: true,
        retiredAt: true,
        template: {
          select: {
            id: true,
            code: true,
            name: true,
            careProgram: {
              select: { id: true, code: true, name: true },
            },
          },
        },
      },
    },
    adoptedByUser: {
      select: { id: true, email: true, role: true },
    },
  } as const;

  private assignmentInclude = {
    scheduleVersion: {
      select: {
        id: true,
        versionNumber: true,
        status: true,
        name: true,
        template: {
          select: {
            id: true,
            code: true,
            name: true,
            careProgram: {
              select: { id: true, code: true, name: true },
            },
          },
        },
      },
    },
    assignedByUser: {
      select: { id: true, email: true, role: true },
    },
  } as const;

  // ── Tenant adoption ────────────────────────────────────────

  async adopt(dto: AdoptScheduleVersionDto, user: AuthUser) {
    const tenantId = this.resolveTenantId(user, dto.tenantId);

    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const version = await this.prisma.scheduleVersion.findUnique({
      where: { id: dto.scheduleVersionId },
    });
    if (!version) {
      throw new NotFoundException('Schedule version not found');
    }
    if (version.status !== ScheduleVersionStatus.PUBLISHED) {
      throw new BadRequestException(
        'Only PUBLISHED schedule versions can be adopted',
      );
    }

    const existing = await this.prisma.tenantScheduleAdoption.findUnique({
      where: {
        tenantId_scheduleVersionId: {
          tenantId,
          scheduleVersionId: dto.scheduleVersionId,
        },
      },
    });

    if (existing && existing.endedAt == null) {
      throw new BadRequestException(
        'Schedule version is already adopted by this tenant',
      );
    }

    if (existing && existing.endedAt != null) {
      return this.prisma.tenantScheduleAdoption.update({
        where: { id: existing.id },
        data: {
          endedAt: null,
          adoptedAt: new Date(),
          adoptedBy: user.userId,
        },
        include: this.adoptionInclude,
      });
    }

    return this.prisma.tenantScheduleAdoption.create({
      data: {
        tenantId,
        scheduleVersionId: dto.scheduleVersionId,
        adoptedBy: user.userId,
      },
      include: this.adoptionInclude,
    });
  }

  async listAdoptions(query: QueryTenantScheduleAdoptionDto, user: AuthUser) {
    const tenantId = this.resolveTenantId(
      user,
      query.tenantId ??
        (user.role === 'PLATFORM_ADMIN' ? user.tenantId ?? undefined : undefined),
    );

    return this.prisma.tenantScheduleAdoption.findMany({
      where: {
        tenantId,
        ...(query.activeOnly ? { endedAt: null } : {}),
      },
      orderBy: { adoptedAt: 'desc' },
      include: this.adoptionInclude,
    });
  }

  async getAdoption(id: string, user: AuthUser) {
    const adoption = await this.prisma.tenantScheduleAdoption.findUnique({
      where: { id },
      include: this.adoptionInclude,
    });
    if (!adoption) {
      throw new NotFoundException('Tenant schedule adoption not found');
    }

    if (user.role === 'PLATFORM_ADMIN') {
      if (!user.tenantId || adoption.tenantId !== user.tenantId) {
        throw new ForbiddenException(
          'Cannot access schedule adoption for another tenant',
        );
      }
    }

    return adoption;
  }

  async revokeAdoption(id: string, user: AuthUser) {
    const adoption = await this.prisma.tenantScheduleAdoption.findUnique({
      where: { id },
    });
    if (!adoption) {
      throw new NotFoundException('Tenant schedule adoption not found');
    }

    if (user.role === 'PLATFORM_ADMIN') {
      if (!user.tenantId || adoption.tenantId !== user.tenantId) {
        throw new ForbiddenException(
          'Cannot revoke schedule adoption for another tenant',
        );
      }
    } else if (user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Insufficient permissions');
    }

    if (adoption.endedAt != null) {
      throw new BadRequestException('Adoption is already revoked');
    }

    return this.prisma.tenantScheduleAdoption.update({
      where: { id },
      data: { endedAt: new Date() },
      include: this.adoptionInclude,
    });
  }

  // ── Patient schedule assignment ────────────────────────────

  private async getTenantScopedPatientProgram(
    patientProgramId: string,
    tenantId: string,
  ) {
    const patientProgram = await this.prisma.patientProgram.findUnique({
      where: { id: patientProgramId },
      include: {
        patient: { select: { id: true, tenantId: true, isDeleted: true } },
        program: { select: { id: true, code: true, name: true } },
      },
    });

    if (!patientProgram || patientProgram.patient.isDeleted) {
      throw new NotFoundException('Patient program not found');
    }

    if (patientProgram.patient.tenantId !== tenantId) {
      throw new ForbiddenException(
        'Cannot access patient program from another tenant',
      );
    }

    return patientProgram;
  }

  private async assertAssignableVersion(tenantId: string, scheduleVersionId: string) {
    const version = await this.prisma.scheduleVersion.findUnique({
      where: { id: scheduleVersionId },
    });
    if (!version) {
      throw new NotFoundException('Schedule version not found');
    }
    if (version.status !== ScheduleVersionStatus.PUBLISHED) {
      throw new BadRequestException(
        'Only PUBLISHED schedule versions can be assigned',
      );
    }

    const adoption = await this.prisma.tenantScheduleAdoption.findFirst({
      where: {
        tenantId,
        scheduleVersionId,
        endedAt: null,
      },
    });
    if (!adoption) {
      throw new BadRequestException(
        'Schedule version has not been adopted by this tenant',
      );
    }

    return version;
  }

  async assignToPatientProgram(
    patientProgramId: string,
    dto: AssignPatientScheduleDto,
    user: AuthUser,
  ) {
    const effectiveTenantId = await this.resolvePatientProgramTenant(
      patientProgramId,
      user,
    );

    await this.getTenantScopedPatientProgram(patientProgramId, effectiveTenantId);
    await this.assertAssignableVersion(effectiveTenantId, dto.scheduleVersionId);

    const active = await this.prisma.patientScheduleAssignment.findFirst({
      where: { patientProgramId, endedAt: null },
    });
    if (active) {
      throw new BadRequestException(
        'Patient program already has an active schedule assignment. Use migrate to change it.',
      );
    }

    return this.prisma.patientScheduleAssignment.create({
      data: {
        patientProgramId,
        scheduleVersionId: dto.scheduleVersionId,
        assignedBy: user.userId,
      },
      include: this.assignmentInclude,
    });
  }

  async listAssignments(patientProgramId: string, user: AuthUser) {
    const effectiveTenantId = await this.resolvePatientProgramTenant(
      patientProgramId,
      user,
    );
    await this.getTenantScopedPatientProgram(patientProgramId, effectiveTenantId);

    return this.prisma.patientScheduleAssignment.findMany({
      where: { patientProgramId },
      orderBy: { assignedAt: 'desc' },
      include: this.assignmentInclude,
    });
  }

  async getCurrentAssignment(patientProgramId: string, user: AuthUser) {
    const effectiveTenantId = await this.resolvePatientProgramTenant(
      patientProgramId,
      user,
    );
    await this.getTenantScopedPatientProgram(patientProgramId, effectiveTenantId);

    const current = await this.prisma.patientScheduleAssignment.findFirst({
      where: { patientProgramId, endedAt: null },
      include: this.assignmentInclude,
    });

    if (!current) {
      throw new NotFoundException('No active schedule assignment found');
    }

    return current;
  }

  async migrateAssignment(
    patientProgramId: string,
    dto: MigratePatientScheduleDto,
    user: AuthUser,
  ) {
    const effectiveTenantId = await this.resolvePatientProgramTenant(
      patientProgramId,
      user,
    );
    await this.getTenantScopedPatientProgram(patientProgramId, effectiveTenantId);
    await this.assertAssignableVersion(effectiveTenantId, dto.scheduleVersionId);

    return this.prisma.$transaction(async (tx) => {
      const active = await tx.patientScheduleAssignment.findFirst({
        where: { patientProgramId, endedAt: null },
      });

      if (!active) {
        throw new BadRequestException(
          'No active schedule assignment to migrate. Use assign instead.',
        );
      }

      if (active.scheduleVersionId === dto.scheduleVersionId) {
        throw new BadRequestException(
          'Patient program is already assigned to this schedule version',
        );
      }

      const endedAt = new Date();

      await tx.patientScheduleAssignment.update({
        where: { id: active.id },
        data: { endedAt },
      });

      return tx.patientScheduleAssignment.create({
        data: {
          patientProgramId,
          scheduleVersionId: dto.scheduleVersionId,
          assignedBy: user.userId,
          assignedAt: endedAt,
        },
        include: this.assignmentInclude,
      });
    });
  }

  private async resolvePatientProgramTenant(
    patientProgramId: string,
    user: AuthUser,
  ): Promise<string> {
    if (user.role === 'PLATFORM_ADMIN') {
      return this.resolveTenantId(user);
    }

    if (user.role === 'SUPER_ADMIN') {
      const pp = await this.prisma.patientProgram.findUnique({
        where: { id: patientProgramId },
        include: { patient: { select: { tenantId: true, isDeleted: true } } },
      });
      if (!pp || pp.patient.isDeleted) {
        throw new NotFoundException('Patient program not found');
      }
      return pp.patient.tenantId;
    }

    throw new ForbiddenException('Insufficient permissions');
  }
}
