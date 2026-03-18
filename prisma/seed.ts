import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

async function main() {
  // 🔒 Prevent accidental production execution
  if (process.env.NODE_ENV === 'production') {
    throw new Error('❌ Seeding not allowed in production');
  }

  try {
    console.log('Seeding started...');

    const hashedPassword = await bcrypt.hash('123456', 10);

    await prisma.$transaction(async (tx) => {
      // 1. create Tenant
      const tenant = await tx.tenant.upsert({
        where: { code: 'TEST001' },
        create: {
          name: 'Test Hospital',
          code: 'TEST001',
          type: 'hospital',
        },
        update: {
          name: 'Test Hospital',
          type: 'hospital',
        },
      });

      // 2. create Admin
      const admin = await tx.user.upsert({
        where: { email: 'admin@test.com' },
        create: {
          email: 'admin@test.com',
          password: hashedPassword,
          role: Role.PLATFORM_ADMIN,
          tenantId: tenant.id,
        },
        update: {
          role: Role.PLATFORM_ADMIN,
        },
      });

      // 3. create Doctor
      const doctor = await tx.user.upsert({
        where: { email: 'doctor@test.com' },
        create: {
          email: 'doctor@test.com',
          password: hashedPassword,
          role: Role.DOCTOR,
          tenantId: tenant.id,
        },
        update: {
          role: Role.DOCTOR,
        },
      });

      // ✅ Clean logs
      console.log('Tenant:', tenant.id, tenant.code);
      console.log('Admin:', admin.email, '| Role:', admin.role);
      console.log('Doctor:', doctor.email, '| Role:', doctor.role);
    });

    console.log('Seeding completed ✅');

  } catch (error) {
    console.error('Seed failed ❌', error);
    throw error as Error;
  } finally {
    await prisma.$disconnect();
  }
}

main();