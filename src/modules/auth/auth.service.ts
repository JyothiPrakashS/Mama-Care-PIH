import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { RegisterPatientDto } from '../patient/dto/register-patient.dto';

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

    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new UnauthorizedException();

    const payload = {
      sub: user.id,
      role: user.role,
      tenantId: user.tenantId,
    };

    return {
      token: this.jwt.sign(payload),
      role: user.role,
      tenantId: user.tenantId,
    };
  }

  async registerPatient(dto: RegisterPatientDto) {
    const { name, phone, password, inviteCode } = dto;
    const normalizedPhone = phone.replace(/\D/g, '');
    const generatedEmail = `${normalizedPhone}@patient.local`;
  
    // 🔹 1. Validate invite code
    const tenant = await this.prisma.tenant.findFirst({
      where: { inviteCode },
    });
  
    if (!tenant) {
      throw new BadRequestException('Invalid invite code');
    }
  
    // 🔹 2. Check existing user
    const existingUser = await this.prisma.user.findUnique({
      where: { phone },
    });
  
    if (existingUser) {
      throw new BadRequestException('User already exists');
    }
  
    // 🔹 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
  
    // 🔹 4. Transaction (VERY IMPORTANT)
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          phone,
          email: generatedEmail,
          password: hashedPassword,
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