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
    const hashedSuperAdminPassword = await bcrypt.hash('superadmin123', 10);

    await prisma.$transaction(async (tx) => {
      // 1. create Tenants
      const tenant1 = await tx.tenant.upsert({
        where: { code: 'TEST001' },
        create: {
          name: 'Hospital A',
          inviteCode: 'INV-TEST001',
          code: 'TEST001',
          type: 'hospital',
        },
        update: { name: 'Hospital A', type: 'hospital' },
      });
      const tenant2 = await tx.tenant.upsert({
        where: { code: 'TEST002' },
        create: {
          name: 'Hospital B',
          inviteCode: 'INV-TEST002',
          code: 'TEST002',
          type: 'hospital',
        },
        update: { name: 'Hospital B', type: 'hospital' },
      });

      // 2. create Admins
      const adminA = await tx.user.upsert({
        where: { email: 'adminA@test.com' },
        create: {
          email: 'adminA@test.com',
          phone: '9000000001',
          password: hashedPassword,
          role: Role.PLATFORM_ADMIN,
          tenantId: tenant1.id,
        },
        update: {
          role: Role.PLATFORM_ADMIN,
        },
      });

      const adminB = await tx.user.upsert({
        where: { email: 'adminB@test.com' },
        create: {
          email: 'adminB@test.com',
          phone: '9000000002',
          password: hashedPassword,
          role: Role.PLATFORM_ADMIN,
          tenantId: tenant2.id,
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
          phone: '9000000003',
          password: hashedPassword,
          role: Role.DOCTOR,
          tenantId: tenant1.id,
        },
        update: {
          role: Role.DOCTOR,
        },
      });
      // 4. create Patient (Tenant A and B)
      // Tenant A
      const patientA = await tx.user.upsert({
        where: { email: 'patientA@test.com' },
        create: {
          email: 'patientA@test.com',
          phone: '9000000004',
          password: hashedPassword,
          role: Role.PATIENT,
          tenantId: tenant1.id,
        },
        update: {
          role: Role.PATIENT,
        },
      });
      // Tenant B
      const patientB = await tx.user.upsert({
        where: { email: 'patientB@test.com' },
        create: {
          email: 'patientB@test.com',
          phone: '9000000005',
          password: hashedPassword,
          role: Role.PATIENT,
          tenantId: tenant2.id,
        },
        update: {
          role: Role.PATIENT,
        },
      });
      // 5. create Nurse
      const nurse = await tx.user.upsert({
        where: { email: 'nurse@test.com' },
        create: {
          email: 'nurse@test.com',
          phone: '9000000006',
          password: hashedPassword,
          role: Role.NURSE,
          tenantId: tenant1.id,
        },
        update: {
          role: Role.NURSE,
        },
      });
      // 6. create Super Admin
      const superAdmin = await tx.user.upsert({
        where: { email: 'superadmin@test.com' },
        create: {
          email: 'superadmin@test.com',
          phone: '9999999999',    
          password: hashedSuperAdminPassword,
          role: Role.SUPER_ADMIN,
          tenantId: null,
        },
        update: {
          password: hashedSuperAdminPassword,
          role: Role.SUPER_ADMIN,
          tenantId: null,
        },
      });
      // ✅ Clean logs
      console.log('Tenant:', tenant1.id, tenant1.code);
      console.log('Admin:', adminA.email, '| Role:', adminA.role);
      console.log('Admin:', adminB.email, '| Role:', adminB.role);
      console.log('Doctor:', doctor.email, '| Role:', doctor.role);
      console.log('Patient:', patientA.email, '| Role:', patientA.role);
      console.log('Patient:', patientB.email, '| Role:', patientB.role);
      console.log('Nurse:', nurse.email, '| Role:', nurse.role);
      console.log('Super Admin:', superAdmin.email, '| Role:', superAdmin.role);
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