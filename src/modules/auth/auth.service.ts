import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { RegisterPatientDto } from '../patient/dto/register-patient.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

/** Matches `Tenant` in prisma/schema.prisma (keeps typings valid if the editor uses a stale @prisma/client). */
type TenantLifecycle = { id: string; isActive: boolean; deletedAt: Date | null };

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(emailOrPhone: string, password: string) {
    let user = await this.prisma.user.findUnique({ where: { email: emailOrPhone } });
    if (!user) {
      user = await this.prisma.user.findUnique({ where: { phone: emailOrPhone } });
      if (!user) throw new UnauthorizedException();
    }

    // TEMPORARY FOR TESTING ONLY:
    // Store and compare plain-text passwords so the value is visible in DB during QA.
    // Re-enable the bcrypt line below before moving to production.
    // const match = await bcrypt.compare(password, user.password);
    const match = password === user.password;
    if (!match) throw new UnauthorizedException('Invalid credentials');

    if ((user.role as string) !== 'SUPER_ADMIN') {
      if (!user.tenantId) {
        throw new UnauthorizedException('Account is not linked to an active organization');
      }

      const tenant = (await this.prisma.tenant.findUnique({
        where: { id: user.tenantId },
      })) as TenantLifecycle | null;

      if (!tenant || !tenant.isActive || tenant.deletedAt != null) {
        throw new UnauthorizedException('Organization is deactivated');
      }
    }

    const payload = {
      sub: user.id,
      role: user.role,
      tenantId: user.tenantId,
    };

    return {
      token: this.jwt.sign(payload),
      role: user.role,
      tenantId: user.tenantId,
      mustChangePassword: user.mustChangePassword
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });
  
    if (!dbUser) {
      throw new BadRequestException('User not found');
    }

    // TEMPORARY FOR TESTING ONLY:
    // Compare raw password values directly so password changes continue working with plain-text DB values.
    // Re-enable the bcrypt line below before moving to production.
    // const match = await bcrypt.compare(dto.oldPassword, dbUser.password);
    const match = dto.oldPassword === dbUser.password;
    if (!match) {
      throw new BadRequestException('Invalid old password');
    }
  
    // TEMPORARY FOR TESTING ONLY:
    // Store the new password in plain text so testers can read it directly from DB.
    // Re-enable the bcrypt line below before moving to production.
    // const hashed = await bcrypt.hash(dto.newPassword, 10);
    const plainPasswordForTesting = dto.newPassword;
  
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        password: plainPasswordForTesting,
        mustChangePassword: false,
      },
    });
  }

  async registerPatient(dto: RegisterPatientDto) {
    const { name, phone, password, inviteCode } = dto;
    const normalizedPhone = phone.replace(/\D/g, '');
    const generatedEmail = `${normalizedPhone}@patient.local`;
  
    // 🔹 1. Validate invite code
    const tenant = (await this.prisma.tenant.findFirst({
      where: { inviteCode },
    })) as TenantLifecycle | null;

    if (!tenant || !tenant.isActive || tenant.deletedAt != null) {
      throw new BadRequestException('Invalid invite code or organization is not accepting registrations');
    }
  
    // 🔹 2. Check existing user
    const existingUser = await this.prisma.user.findUnique({
      where: { phone },
    });
  
    if (existingUser) {
      throw new BadRequestException('User already exists');
    }
  
    // TEMPORARY FOR TESTING ONLY:
    // Store raw patient password so it is visible in DB during QA.
    // Re-enable the bcrypt line below before moving to production.
    // const hashedPassword = await bcrypt.hash(password, 10);
    const plainPasswordForTesting = password;
  
    // 🔹 4. Transaction (VERY IMPORTANT)
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          phone,
          email: generatedEmail,
          password: plainPasswordForTesting,
          role: 'PATIENT',
          tenantId: tenant.id,
        },
      });
  
      const patient = await tx.patient.create({
        data: {
          name,
          age: 0,
          phone,
          tenantId: tenant.id,
          userId: user.id, // 🔥 link
          createdBy: user.id,
        },
      });
  
      return { user, patient };
    });
  }     
}