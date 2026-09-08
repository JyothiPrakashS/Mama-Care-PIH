import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { QueryContentDto } from './dto/query-content.dto';

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeCode(code: string): string {
    return code.trim().toUpperCase();
  }

  private contentSelect = {
    id: true,
    code: true,
    title: true,
    description: true,
    type: true,
    storageKey: true,
    contentUrl: true,
    thumbnailUrl: true,
    createdAt: true,
    updatedAt: true,
  } satisfies Prisma.ContentSelect;

  async create(dto: CreateContentDto) {
    const code = this.normalizeCode(dto.code);
    const existing = await this.prisma.content.findUnique({ where: { code } });
    if (existing) {
      throw new BadRequestException('Content with this code already exists');
    }

    return this.prisma.content.create({
      data: {
        code,
        title: dto.title.trim(),
        type: dto.type,
        description: dto.description?.trim(),
        storageKey: dto.storageKey?.trim(),
        contentUrl: dto.contentUrl?.trim(),
        thumbnailUrl: dto.thumbnailUrl?.trim(),
      },
      select: this.contentSelect,
    });
  }

  async findAll(query: QueryContentDto) {
    const where: Prisma.ContentWhereInput = {};
    if (query.type) where.type = query.type;
    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.content.findMany({
      where,
      orderBy: { title: 'asc' },
      select: this.contentSelect,
    });
  }

  async findOne(id: string) {
    const content = await this.prisma.content.findUnique({
      where: { id },
      select: this.contentSelect,
    });
    if (!content) {
      throw new NotFoundException('Content not found');
    }
    return content;
  }

  async update(id: string, dto: UpdateContentDto) {
    const existing = await this.prisma.content.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Content not found');
    }

    const nextCode = dto.code ? this.normalizeCode(dto.code) : undefined;
    if (nextCode && nextCode !== existing.code) {
      const conflict = await this.prisma.content.findUnique({
        where: { code: nextCode },
      });
      if (conflict) {
        throw new BadRequestException('Content with this code already exists');
      }
    }

    return this.prisma.content.update({
      where: { id },
      data: {
        ...(nextCode !== undefined && { code: nextCode }),
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.description !== undefined && {
          description: dto.description.trim(),
        }),
        ...(dto.storageKey !== undefined && {
          storageKey: dto.storageKey.trim(),
        }),
        ...(dto.contentUrl !== undefined && {
          contentUrl: dto.contentUrl.trim(),
        }),
        ...(dto.thumbnailUrl !== undefined && {
          thumbnailUrl: dto.thumbnailUrl.trim(),
        }),
      },
      select: this.contentSelect,
    });
  }
}
