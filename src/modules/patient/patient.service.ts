import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { QueryPatientDto } from './dto/query-patient.dto';
@Injectable()
export class PatientService {
  constructor(private prisma: PrismaService) { }

  private async getAssignedPatientIdsForDoctor(doctorId: string, tenantId: string) {
    const mappings = await this.prisma.doctorPatient.findMany({
      where: {
        doctorId,
        tenantId,
      },
      select: {
        patientId: true,
      },
    });

    return mappings.map((mapping) => mapping.patientId);
  }

  async create(createPatientDto: CreatePatientDto, user: any) {
    return this.prisma.patient.create({
      data: {
        ...createPatientDto,
        tenantId: user.tenantId,
        createdBy: user.userId,
      },
    });
  }

  async getMyProfile(user: any) {
    const patient = await this.prisma.patient.findFirst({
      where: {
        userId: user.userId, 
        tenantId: user.tenantId,
        isDeleted: false,
      },
    });
  
    if (!patient) {
      throw new NotFoundException('Patient profile not found');
    }
  
    return patient;
  }

  async findAll(query: QueryPatientDto, user: any) {

    if (query.includeDeleted || query.isDeleted) {
      if (user.role !== 'PLATFORM_ADMIN') {
        throw new ForbiddenException('Access denied');
      }
    }
    
    const { page = 1, limit = 10, search, isDeleted,
      includeDeleted, } = query;

    // `page`/`limit` often arrive as strings from query params.
    const pageNum = Number.parseInt(String(page), 10) || 1;
    const limitNum = Number.parseInt(String(limit), 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      tenantId: user.tenantId, // 🔥 Tenant isolation
    };

    if (user.role === 'DOCTOR') {
      const assignedPatientIds = await this.getAssignedPatientIdsForDoctor(
        user.userId,
        user.tenantId,
      );
      where.id = { in: assignedPatientIds };
    }

    // 🔥 Advanced filtering logic
    if (includeDeleted) {
      // no filter → include all
    } else if (isDeleted !== undefined) {
      where.isDeleted = isDeleted;
    } else {
      where.isDeleted = false; // default
    }

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
    const where: any = {
      id,
      tenantId: user.tenantId, // 🔥 CRITICAL: tenant isolation
      isDeleted: false, // 🔥 exclude deleted
    };

    if (user.role === 'DOCTOR') {
      const assignedPatientIds = await this.getAssignedPatientIdsForDoctor(
        user.userId,
        user.tenantId,
      );
      where.id = { in: assignedPatientIds };
    }

    const patient = await this.prisma.patient.findFirst({ where });

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

  async restore(id: string, user: any) {
    const patient = await this.prisma.patient.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
        isDeleted: true, // 🔥 only deleted can be restored
      },
    });
  
    if (!patient) {
      throw new NotFoundException('Deleted patient not found');
    }
  
    return this.prisma.patient.update({
      where: { id },
      data: {
        isDeleted: false,
        deletedAt: null,
      },
    });
  }
}