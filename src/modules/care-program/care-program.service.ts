import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { CreateCareProgramDto } from './dto/create-care-program.dto';
import { UpdateCareProgramDto } from './dto/update-care-program.dto';
import { QueryCareProgramDto } from './dto/query-care-program.dto';

@Injectable()
export class CareProgramService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeCode(code: string): string {
    return code.trim().toUpperCase();
  }

  async findAll(query: QueryCareProgramDto) {
    const where =
      query.isActive === undefined ? {} : { isActive: query.isActive };

    return this.prisma.careProgram.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        isPaid: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async findOne(id: string) {
    const program = await this.prisma.careProgram.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        isPaid: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!program) {
      throw new NotFoundException('Care program not found');
    }

    return program;
  }

  async create(dto: CreateCareProgramDto) {
    const code = this.normalizeCode(dto.code);

    const existing = await this.prisma.careProgram.findFirst({
      where: {
        OR: [{ code }, { name: dto.name.trim() }],
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Care program with this name or code already exists',
      );
    }

    return this.prisma.careProgram.create({
      data: {
        name: dto.name.trim(),
        code,
        description: dto.description?.trim(),
        isPaid: dto.isPaid ?? false,
        isActive: dto.isActive ?? true,
      },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        isPaid: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async update(id: string, dto: UpdateCareProgramDto) {
    const existing = await this.prisma.careProgram.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Care program not found');
    }

    const nextCode = dto.code ? this.normalizeCode(dto.code) : undefined;
    const nextName = dto.name?.trim();

    if (nextCode || nextName) {
      const conflict = await this.prisma.careProgram.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(nextCode ? [{ code: nextCode }] : []),
            ...(nextName ? [{ name: nextName }] : []),
          ],
        },
      });

      if (conflict) {
        throw new BadRequestException(
          'Care program with this name or code already exists',
        );
      }
    }

    return this.prisma.careProgram.update({
      where: { id },
      data: {
        ...(nextName !== undefined && { name: nextName }),
        ...(nextCode !== undefined && { code: nextCode }),
        ...(dto.description !== undefined && {
          description: dto.description.trim(),
        }),
        ...(dto.isPaid !== undefined && { isPaid: dto.isPaid }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        isPaid: true,
        isActive: true,
        createdAt: true,
      },
    });
  }
}
