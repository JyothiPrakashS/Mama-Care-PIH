import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ScheduleRuleType,
  ScheduleVersionStatus,
} from '@prisma/client';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { CreateScheduleTemplateDto } from './dto/create-schedule-template.dto';
import { UpdateScheduleTemplateDto } from './dto/update-schedule-template.dto';
import { QueryScheduleTemplateDto } from './dto/query-schedule-template.dto';
import { CreateScheduleVersionDto } from './dto/create-schedule-version.dto';
import { UpdateScheduleVersionDto } from './dto/update-schedule-version.dto';
import {
  CreateScheduleRuleDto,
  UpdateScheduleRuleDto,
} from './dto/schedule-rule.dto';
import {
  CreateScheduleRuleItemDto,
  UpdateScheduleRuleItemDto,
} from './dto/schedule-rule-item.dto';

@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeCode(code: string): string {
    return code.trim().toUpperCase();
  }

  private assertDraft(status: ScheduleVersionStatus) {
    if (status !== ScheduleVersionStatus.DRAFT) {
      throw new BadRequestException(
        'Only DRAFT schedule versions can be modified',
      );
    }
  }

  private assertValidRange(start: number, end: number) {
    if (start < 1) {
      throw new BadRequestException('startInterventionDay must be >= 1');
    }
    if (end < start) {
      throw new BadRequestException(
        'endInterventionDay must be >= startInterventionDay',
      );
    }
  }

  // ── Templates ──────────────────────────────────────────────

  async createTemplate(dto: CreateScheduleTemplateDto) {
    const code = this.normalizeCode(dto.code);

    const careProgram = await this.prisma.careProgram.findUnique({
      where: { id: dto.careProgramId },
    });
    if (!careProgram) {
      throw new NotFoundException('Care program not found');
    }

    const existing = await this.prisma.scheduleTemplate.findUnique({
      where: {
        careProgramId_code: {
          careProgramId: dto.careProgramId,
          code,
        },
      },
    });
    if (existing) {
      throw new BadRequestException(
        'Schedule template with this code already exists for the care program',
      );
    }

    return this.prisma.scheduleTemplate.create({
      data: {
        careProgramId: dto.careProgramId,
        name: dto.name.trim(),
        code,
        description: dto.description?.trim(),
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findTemplates(query: QueryScheduleTemplateDto) {
    const where: Prisma.ScheduleTemplateWhereInput = {};
    if (query.careProgramId) where.careProgramId = query.careProgramId;
    if (query.isActive !== undefined) where.isActive = query.isActive;

    return this.prisma.scheduleTemplate.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        careProgram: { select: { id: true, code: true, name: true } },
        versions: {
          select: {
            id: true,
            versionNumber: true,
            status: true,
            name: true,
          },
          orderBy: { versionNumber: 'asc' },
        },
      },
    });
  }

  async findTemplate(id: string) {
    const template = await this.prisma.scheduleTemplate.findUnique({
      where: { id },
      include: {
        careProgram: { select: { id: true, code: true, name: true } },
        versions: {
          orderBy: { versionNumber: 'asc' },
        },
      },
    });
    if (!template) {
      throw new NotFoundException('Schedule template not found');
    }
    return template;
  }

  async updateTemplate(id: string, dto: UpdateScheduleTemplateDto) {
    const existing = await this.prisma.scheduleTemplate.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Schedule template not found');
    }

    const nextCode = dto.code ? this.normalizeCode(dto.code) : undefined;
    if (nextCode && nextCode !== existing.code) {
      const conflict = await this.prisma.scheduleTemplate.findUnique({
        where: {
          careProgramId_code: {
            careProgramId: existing.careProgramId,
            code: nextCode,
          },
        },
      });
      if (conflict) {
        throw new BadRequestException(
          'Schedule template with this code already exists for the care program',
        );
      }
    }

    return this.prisma.scheduleTemplate.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(nextCode !== undefined && { code: nextCode }),
        ...(dto.description !== undefined && {
          description: dto.description.trim(),
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  // ── Versions ───────────────────────────────────────────────

  async createVersion(templateId: string, dto: CreateScheduleVersionDto) {
    const template = await this.prisma.scheduleTemplate.findUnique({
      where: { id: templateId },
    });
    if (!template) {
      throw new NotFoundException('Schedule template not found');
    }

    let versionNumber = dto.versionNumber;
    if (!versionNumber) {
      const latest = await this.prisma.scheduleVersion.findFirst({
        where: { templateId },
        orderBy: { versionNumber: 'desc' },
        select: { versionNumber: true },
      });
      versionNumber = (latest?.versionNumber ?? 0) + 1;
    }

    const conflict = await this.prisma.scheduleVersion.findUnique({
      where: {
        templateId_versionNumber: { templateId, versionNumber },
      },
    });
    if (conflict) {
      throw new BadRequestException(
        'Schedule version number already exists for this template',
      );
    }

    return this.prisma.scheduleVersion.create({
      data: {
        templateId,
        versionNumber,
        status: ScheduleVersionStatus.DRAFT,
        name: dto.name?.trim(),
        description: dto.description?.trim(),
      },
    });
  }

  async findVersions(templateId: string) {
    await this.findTemplate(templateId);
    return this.prisma.scheduleVersion.findMany({
      where: { templateId },
      orderBy: { versionNumber: 'asc' },
      include: {
        _count: { select: { rules: true } },
      },
    });
  }

  async findVersion(id: string) {
    const version = await this.prisma.scheduleVersion.findUnique({
      where: { id },
      include: {
        template: {
          select: {
            id: true,
            code: true,
            name: true,
            careProgramId: true,
          },
        },
        rules: {
          orderBy: { startInterventionDay: 'asc' },
          include: {
            items: {
              orderBy: { position: 'asc' },
              include: {
                activity: {
                  select: {
                    id: true,
                    code: true,
                    title: true,
                    type: true,
                    isActive: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!version) {
      throw new NotFoundException('Schedule version not found');
    }
    return version;
  }

  async updateVersion(id: string, dto: UpdateScheduleVersionDto) {
    const version = await this.prisma.scheduleVersion.findUnique({
      where: { id },
    });
    if (!version) {
      throw new NotFoundException('Schedule version not found');
    }
    this.assertDraft(version.status);

    return this.prisma.scheduleVersion.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.description !== undefined && {
          description: dto.description.trim(),
        }),
      },
    });
  }

  async publishVersion(id: string) {
    const version = await this.findVersion(id);

    if (version.status === ScheduleVersionStatus.PUBLISHED) {
      throw new BadRequestException('Schedule version is already published');
    }
    if (version.status === ScheduleVersionStatus.RETIRED) {
      throw new BadRequestException('Retired schedule versions cannot be published');
    }

    if (!version.rules.length) {
      throw new BadRequestException(
        'Cannot publish: version must have at least one schedule rule',
      );
    }

    const sortedRules = [...version.rules].sort(
      (a, b) => a.startInterventionDay - b.startInterventionDay,
    );

    for (const rule of sortedRules) {
      this.assertValidRange(rule.startInterventionDay, rule.endInterventionDay);

      if (!rule.items.length) {
        throw new BadRequestException(
          `Cannot publish: rule ${rule.id} has no rule items`,
        );
      }

      const positions = rule.items.map((i) => i.position).sort((a, b) => a - b);
      for (let i = 0; i < positions.length; i++) {
        if (positions[i] !== i + 1) {
          throw new BadRequestException(
            `Cannot publish: rule items must have contiguous positions starting at 1`,
          );
        }
      }

      if (rule.ruleType === ScheduleRuleType.SEQUENCE) {
        const dayCount =
          rule.endInterventionDay - rule.startInterventionDay + 1;
        if (rule.items.length !== dayCount) {
          throw new BadRequestException(
            `Cannot publish: SEQUENCE rule must have exactly ${dayCount} items for days ${rule.startInterventionDay}-${rule.endInterventionDay}`,
          );
        }
      }

      for (const item of rule.items) {
        if (!item.activity.isActive) {
          throw new BadRequestException(
            `Cannot publish: activity ${item.activity.code} is inactive`,
          );
        }
      }
    }

    for (let i = 0; i < sortedRules.length; i++) {
      for (let j = i + 1; j < sortedRules.length; j++) {
        const a = sortedRules[i];
        const b = sortedRules[j];
        const overlaps =
          a.startInterventionDay <= b.endInterventionDay &&
          b.startInterventionDay <= a.endInterventionDay;
        if (overlaps) {
          throw new BadRequestException(
            'Cannot publish: schedule rules have overlapping intervention-day ranges',
          );
        }
      }
    }

    return this.prisma.scheduleVersion.update({
      where: { id },
      data: {
        status: ScheduleVersionStatus.PUBLISHED,
        publishedAt: new Date(),
        retiredAt: null,
      },
    });
  }

  async retireVersion(id: string) {
    const version = await this.prisma.scheduleVersion.findUnique({
      where: { id },
    });
    if (!version) {
      throw new NotFoundException('Schedule version not found');
    }

    if (version.status !== ScheduleVersionStatus.PUBLISHED) {
      throw new BadRequestException(
        'Only PUBLISHED schedule versions can be retired',
      );
    }

    return this.prisma.scheduleVersion.update({
      where: { id },
      data: {
        status: ScheduleVersionStatus.RETIRED,
        retiredAt: new Date(),
      },
    });
  }

  // ── Rules ──────────────────────────────────────────────────

  async createRule(versionId: string, dto: CreateScheduleRuleDto) {
    const version = await this.prisma.scheduleVersion.findUnique({
      where: { id: versionId },
    });
    if (!version) {
      throw new NotFoundException('Schedule version not found');
    }
    this.assertDraft(version.status);
    this.assertValidRange(dto.startInterventionDay, dto.endInterventionDay);

    return this.prisma.scheduleRule.create({
      data: {
        scheduleVersionId: versionId,
        startInterventionDay: dto.startInterventionDay,
        endInterventionDay: dto.endInterventionDay,
        ruleType: dto.ruleType,
      },
    });
  }

  async findRules(versionId: string) {
    await this.findVersion(versionId);
    return this.prisma.scheduleRule.findMany({
      where: { scheduleVersionId: versionId },
      orderBy: { startInterventionDay: 'asc' },
      include: {
        items: {
          orderBy: { position: 'asc' },
          include: {
            activity: {
              select: {
                id: true,
                code: true,
                title: true,
                type: true,
                isActive: true,
              },
            },
          },
        },
      },
    });
  }

  async updateRule(ruleId: string, dto: UpdateScheduleRuleDto) {
    const rule = await this.prisma.scheduleRule.findUnique({
      where: { id: ruleId },
      include: { scheduleVersion: true },
    });
    if (!rule) {
      throw new NotFoundException('Schedule rule not found');
    }
    this.assertDraft(rule.scheduleVersion.status);

    const start = dto.startInterventionDay ?? rule.startInterventionDay;
    const end = dto.endInterventionDay ?? rule.endInterventionDay;
    this.assertValidRange(start, end);

    return this.prisma.scheduleRule.update({
      where: { id: ruleId },
      data: {
        ...(dto.startInterventionDay !== undefined && {
          startInterventionDay: dto.startInterventionDay,
        }),
        ...(dto.endInterventionDay !== undefined && {
          endInterventionDay: dto.endInterventionDay,
        }),
        ...(dto.ruleType !== undefined && { ruleType: dto.ruleType }),
      },
    });
  }

  async deleteRule(ruleId: string) {
    const rule = await this.prisma.scheduleRule.findUnique({
      where: { id: ruleId },
      include: { scheduleVersion: true },
    });
    if (!rule) {
      throw new NotFoundException('Schedule rule not found');
    }
    this.assertDraft(rule.scheduleVersion.status);

    await this.prisma.$transaction([
      this.prisma.scheduleRuleItem.deleteMany({ where: { ruleId } }),
      this.prisma.scheduleRule.delete({ where: { id: ruleId } }),
    ]);

    return { message: 'Schedule rule deleted' };
  }

  // ── Rule Items ─────────────────────────────────────────────

  async createRuleItem(ruleId: string, dto: CreateScheduleRuleItemDto) {
    const rule = await this.prisma.scheduleRule.findUnique({
      where: { id: ruleId },
      include: { scheduleVersion: true },
    });
    if (!rule) {
      throw new NotFoundException('Schedule rule not found');
    }
    this.assertDraft(rule.scheduleVersion.status);

    const activity = await this.prisma.activity.findUnique({
      where: { id: dto.activityId },
    });
    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    const positionConflict = await this.prisma.scheduleRuleItem.findUnique({
      where: {
        ruleId_position: { ruleId, position: dto.position },
      },
    });
    if (positionConflict) {
      throw new BadRequestException(
        'Rule item position already exists for this rule',
      );
    }

    return this.prisma.scheduleRuleItem.create({
      data: {
        ruleId,
        activityId: dto.activityId,
        position: dto.position,
      },
      include: {
        activity: {
          select: {
            id: true,
            code: true,
            title: true,
            type: true,
            isActive: true,
          },
        },
      },
    });
  }

  async findRuleItems(ruleId: string) {
    const rule = await this.prisma.scheduleRule.findUnique({
      where: { id: ruleId },
    });
    if (!rule) {
      throw new NotFoundException('Schedule rule not found');
    }

    return this.prisma.scheduleRuleItem.findMany({
      where: { ruleId },
      orderBy: { position: 'asc' },
      include: {
        activity: {
          select: {
            id: true,
            code: true,
            title: true,
            type: true,
            isActive: true,
          },
        },
      },
    });
  }

  async updateRuleItem(itemId: string, dto: UpdateScheduleRuleItemDto) {
    const item = await this.prisma.scheduleRuleItem.findUnique({
      where: { id: itemId },
      include: { rule: { include: { scheduleVersion: true } } },
    });
    if (!item) {
      throw new NotFoundException('Schedule rule item not found');
    }
    this.assertDraft(item.rule.scheduleVersion.status);

    if (dto.activityId) {
      const activity = await this.prisma.activity.findUnique({
        where: { id: dto.activityId },
      });
      if (!activity) {
        throw new NotFoundException('Activity not found');
      }
    }

    if (dto.position !== undefined && dto.position !== item.position) {
      const conflict = await this.prisma.scheduleRuleItem.findUnique({
        where: {
          ruleId_position: { ruleId: item.ruleId, position: dto.position },
        },
      });
      if (conflict) {
        throw new BadRequestException(
          'Rule item position already exists for this rule',
        );
      }
    }

    return this.prisma.scheduleRuleItem.update({
      where: { id: itemId },
      data: {
        ...(dto.activityId !== undefined && { activityId: dto.activityId }),
        ...(dto.position !== undefined && { position: dto.position }),
      },
      include: {
        activity: {
          select: {
            id: true,
            code: true,
            title: true,
            type: true,
            isActive: true,
          },
        },
      },
    });
  }

  async deleteRuleItem(itemId: string) {
    const item = await this.prisma.scheduleRuleItem.findUnique({
      where: { id: itemId },
      include: { rule: { include: { scheduleVersion: true } } },
    });
    if (!item) {
      throw new NotFoundException('Schedule rule item not found');
    }
    this.assertDraft(item.rule.scheduleVersion.status);

    await this.prisma.scheduleRuleItem.delete({ where: { id: itemId } });
    return { message: 'Schedule rule item deleted' };
  }
}
