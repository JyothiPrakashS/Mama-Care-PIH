import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

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

    // TEMPORARY FOR TESTING ONLY:
    // Seed plain-text passwords so they are visible directly in DB during QA.
    // Re-enable the bcrypt lines below before moving to production.
    // const hashedPassword = await bcrypt.hash('123456', 10);
    // const hashedSuperAdminPassword = await bcrypt.hash('superadmin123', 10);
    const plainSeedPassword = '123456';
    const plainSuperAdminPassword = 'superadmin123';

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
          password: plainSeedPassword,
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
          password: plainSeedPassword,
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
          password: plainSeedPassword,
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
          password: plainSeedPassword,
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
          password: plainSeedPassword,
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
          password: plainSeedPassword,
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
          password: plainSuperAdminPassword,
          role: Role.SUPER_ADMIN,
          tenantId: null,
        },
        update: {
          password: plainSuperAdminPassword,
          role: Role.SUPER_ADMIN,
          tenantId: null,
        },
      });

      // 7. create linked Patient profiles (required for care program assignment)
      const patientProfileA = await tx.patient.upsert({
        where: { userId: patientA.id },
        create: {
          name: 'Patient A',
          age: 28,
          phone: patientA.phone,
          tenantId: tenant1.id,
          userId: patientA.id,
          createdBy: adminA.id,
        },
        update: {
          name: 'Patient A',
          phone: patientA.phone,
          tenantId: tenant1.id,
          isDeleted: false,
          deletedAt: null,
        },
      });

      const patientProfileB = await tx.patient.upsert({
        where: { userId: patientB.id },
        create: {
          name: 'Patient B',
          age: 30,
          phone: patientB.phone,
          tenantId: tenant2.id,
          userId: patientB.id,
          createdBy: adminB.id,
        },
        update: {
          name: 'Patient B',
          phone: patientB.phone,
          tenantId: tenant2.id,
          isDeleted: false,
          deletedAt: null,
        },
      });

      // 8. create Care Programs
      const normalProgram = await tx.careProgram.upsert({
        where: { code: 'NORMAL_PREGNANCY' },
        create: {
          name: 'Normal Pregnancy Program',
          code: 'NORMAL_PREGNANCY',
          description: 'Standard pregnancy monitoring program',
          isPaid: false,
        },
        update: {
          name: 'Normal Pregnancy Program',
          description: 'Standard pregnancy monitoring program',
          isPaid: false,
          isActive: true,
        },
      });

      const pihProgram = await tx.careProgram.upsert({
        where: { code: 'PIH_CARE' },
        create: {
          name: 'PIH Care Program',
          code: 'PIH_CARE',
          description: 'Pregnancy induced hypertension care program',
          isPaid: false,
        },
        update: {
          name: 'PIH Care Program',
          description: 'Pregnancy induced hypertension care program',
          isPaid: false,
          isActive: true,
        },
      });

      // 9. assign patients to care programs
      await tx.patientProgram.upsert({
        where: {
          patientId_programId: {
            patientId: patientProfileA.id,
            programId: normalProgram.id,
          },
        },
        create: {
          patientId: patientProfileA.id,
          programId: normalProgram.id,
          startDate: new Date(),
          isActive: true,
        },
        update: {
          startDate: new Date(),
          endDate: null,
          isActive: true,
        },
      });

      await tx.patientProgram.upsert({
        where: {
          patientId_programId: {
            patientId: patientProfileB.id,
            programId: pihProgram.id,
          },
        },
        create: {
          patientId: patientProfileB.id,
          programId: pihProgram.id,
          startDate: new Date(),
          isActive: true,
        },
        update: {
          startDate: new Date(),
          endDate: null,
          isActive: true,
        },
      });

      // ✅ Clean logs
      console.log('Tenant:', tenant1.id, tenant1.code);
      console.log('Admin:', adminA.email, '| Role:', adminA.role);
      console.log('Admin:', adminB.email, '| Role:', adminB.role);
      console.log('Doctor:', doctor.email, '| Role:', doctor.role);
      console.log('Patient User:', patientA.email, '| Role:', patientA.role);
      console.log('Patient Profile A:', patientProfileA.id);
      console.log('Patient User:', patientB.email, '| Role:', patientB.role);
      console.log('Patient Profile B:', patientProfileB.id);
      console.log('Nurse:', nurse.email, '| Role:', nurse.role);
      console.log('Super Admin:', superAdmin.email, '| Role:', superAdmin.role);
      console.log('Care Program:', normalProgram.code, normalProgram.id);
      console.log('Care Program:', pihProgram.code, pihProgram.id);
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