import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { QueryActivityDto } from './dto/query-activity.dto';
import { AttachContentDto } from './dto/attach-content.dto';

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeCode(code: string): string {
    return code.trim().toUpperCase();
  }

  private activitySelect = {
    id: true,
    code: true,
    title: true,
    type: true,
    description: true,
    instructions: true,
    quickNote: true,
    estimatedMinutes: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
  } satisfies Prisma.ActivitySelect;

  async create(dto: CreateActivityDto) {
    const code = this.normalizeCode(dto.code);

    const existing = await this.prisma.activity.findUnique({ where: { code } });
    if (existing) {
      throw new BadRequestException('Activity with this code already exists');
    }

    return this.prisma.activity.create({
      data: {
        code,
        title: dto.title.trim(),
        type: dto.type,
        description: dto.description?.trim(),
        instructions: dto.instructions?.trim(),
        quickNote: dto.quickNote?.trim(),
        estimatedMinutes: dto.estimatedMinutes,
        isActive: dto.isActive ?? true,
      },
      select: this.activitySelect,
    });
  }

  async findAll(query: QueryActivityDto) {
    const where: Prisma.ActivityWhereInput = {};

    if (query.type) where.type = query.type;
    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.activity.findMany({
      where,
      orderBy: [{ type: 'asc' }, { title: 'asc' }],
      select: this.activitySelect,
    });
  }

  async findOne(id: string) {
    const activity = await this.prisma.activity.findUnique({
      where: { id },
      select: {
        ...this.activitySelect,
        contents: {
          orderBy: { displayOrder: 'asc' },
          select: {
            id: true,
            displayOrder: true,
            content: {
              select: {
                id: true,
                code: true,
                title: true,
                type: true,
                description: true,
                storageKey: true,
                contentUrl: true,
                thumbnailUrl: true,
              },
            },
          },
        },
      },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    return activity;
  }

  async update(id: string, dto: UpdateActivityDto) {
    const existing = await this.prisma.activity.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Activity not found');
    }

    const nextCode = dto.code ? this.normalizeCode(dto.code) : undefined;
    if (nextCode && nextCode !== existing.code) {
      const conflict = await this.prisma.activity.findUnique({
        where: { code: nextCode },
      });
      if (conflict) {
        throw new BadRequestException('Activity with this code already exists');
      }
    }

    return this.prisma.activity.update({
      where: { id },
      data: {
        ...(nextCode !== undefined && { code: nextCode }),
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.description !== undefined && {
          description: dto.description.trim(),
        }),
        ...(dto.instructions !== undefined && {
          instructions: dto.instructions.trim(),
        }),
        ...(dto.quickNote !== undefined && { quickNote: dto.quickNote.trim() }),
        ...(dto.estimatedMinutes !== undefined && {
          estimatedMinutes: dto.estimatedMinutes,
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      select: this.activitySelect,
    });
  }

  async attachContent(activityId: string, dto: AttachContentDto) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
    });
    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    const content = await this.prisma.content.findUnique({
      where: { id: dto.contentId },
    });
    if (!content) {
      throw new NotFoundException('Content not found');
    }

    const existing = await this.prisma.activityContent.findUnique({
      where: {
        activityId_contentId: {
          activityId,
          contentId: dto.contentId,
        },
      },
    });
    if (existing) {
      throw new BadRequestException('Content is already attached to this activity');
    }

    return this.prisma.activityContent.create({
      data: {
        activityId,
        contentId: dto.contentId,
        displayOrder: dto.displayOrder ?? 0,
      },
      select: {
        id: true,
        displayOrder: true,
        activityId: true,
        contentId: true,
        content: {
          select: {
            id: true,
            code: true,
            title: true,
            type: true,
            contentUrl: true,
          },
        },
      },
    });
  }

  async listContent(activityId: string) {
    await this.findOne(activityId);

    return this.prisma.activityContent.findMany({
      where: { activityId },
      orderBy: { displayOrder: 'asc' },
      select: {
        id: true,
        displayOrder: true,
        content: {
          select: {
            id: true,
            code: true,
            title: true,
            type: true,
            description: true,
            storageKey: true,
            contentUrl: true,
            thumbnailUrl: true,
          },
        },
      },
    });
  }

  async detachContent(activityId: string, contentId: string) {
    const existing = await this.prisma.activityContent.findUnique({
      where: {
        activityId_contentId: { activityId, contentId },
      },
    });

    if (!existing) {
      throw new NotFoundException('Activity content association not found');
    }

    await this.prisma.activityContent.delete({
      where: { id: existing.id },
    });

    return { message: 'Content detached from activity' };
  }
}
