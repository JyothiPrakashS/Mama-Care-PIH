import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { QueryPatientDto } from './dto/query-patient.dto';
@Injectable()
export class PatientService {
  constructor(private prisma: PrismaService) {}

  async create(createPatientDto: CreatePatientDto, user: any) {
    return this.prisma.patient.create({
      data: {
        ...createPatientDto,
        tenantId: user.tenantId,
        createdBy: user.userId,
      },
    });
  }

  async findAll(query: QueryPatientDto, user: any) {
    const { page = 1, limit = 10, search } = query;

    // `page`/`limit` often arrive as strings from query params.
    const pageNum = Number.parseInt(String(page), 10) || 1;
    const limitNum = Number.parseInt(String(limit), 10) || 10;
    const skip = (pageNum - 1) * limitNum;
  
    const where: any = {
      tenantId: user.tenantId, // 🔥 Tenant isolation
      isDeleted: false, // 🔥 exclude deleted
    };
  
    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }
  
    const [data, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.patient.count({ where }),
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

  async findOne(id: string, user: any) {
    const patient = await this.prisma.patient.findFirst({
      where: {
        id,
        tenantId: user.tenantId, // 🔥 CRITICAL: tenant isolation
        isDeleted: false, // 🔥 exclude deleted
      },
    });
  
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }
  
    return patient;
  }

  async update(id: string, dto: UpdatePatientDto, user: any) {
    // Step 1: Ensure patient belongs to tenant
    const existingPatient = await this.prisma.patient.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
        isDeleted: false,
      },
    });
  
    if (!existingPatient) {
      throw new NotFoundException('Patient not found');
    }

     // 🔐 Step 2: Remove restricted fields (VERY IMPORTANT)
    const { tenantId, createdBy, ...safeData } = dto as UpdatePatientDto & { tenantId?: string; createdBy?: string };
  
    // Step 3: Update
    return this.prisma.patient.update({
      where: { id },
      data: safeData,
    });
  }

  async remove(id: string, user: any) {
    const patient = await this.prisma.patient.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
        isDeleted: false,
      },
    });
  
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }
  
    return this.prisma.patient.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });
  }
}