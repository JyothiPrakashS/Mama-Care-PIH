import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, ScheduleVersionStatus } from '@prisma/client';
import { TenantScheduleService } from './tenant-schedule.service';

const PIH_CARE_PROGRAM_ID = 'cp-pih';
const NORMAL_PREGNANCY_PROGRAM_ID = 'cp-normal';

function uniqueConflictError() {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target: ['patientProgramId'] },
  });
}

function publishedVersion(
  id: string,
  careProgramId: string = PIH_CARE_PROGRAM_ID,
) {
  return {
    id,
    status: ScheduleVersionStatus.PUBLISHED,
    template: { careProgramId },
  };
}

describe('TenantScheduleService', () => {
  let service: TenantScheduleService;
  let prisma: any;

  const adminA = {
    userId: 'user-a',
    role: 'PLATFORM_ADMIN',
    tenantId: 'tenant-a',
  };

  const adminB = {
    userId: 'user-b',
    role: 'PLATFORM_ADMIN',
    tenantId: 'tenant-b',
  };

  beforeEach(() => {
    prisma = {
      tenant: { findFirst: jest.fn() },
      scheduleVersion: { findUnique: jest.fn() },
      tenantScheduleAdoption: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      patientProgram: { findUnique: jest.fn() },
      patientScheduleAssignment: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(async (fn) => fn(prisma)),
    };
    service = new TenantScheduleService(prisma);
  });

  describe('tenant adoption', () => {
    it('allows PLATFORM_ADMIN to adopt a PUBLISHED version for own tenant', async () => {
      prisma.tenant.findFirst.mockResolvedValue({ id: 'tenant-a' });
      prisma.scheduleVersion.findUnique.mockResolvedValue({
        id: 'v1',
        status: ScheduleVersionStatus.PUBLISHED,
      });
      prisma.tenantScheduleAdoption.findUnique.mockResolvedValue(null);
      prisma.tenantScheduleAdoption.create.mockResolvedValue({
        id: 'adopt-1',
        tenantId: 'tenant-a',
        scheduleVersionId: 'v1',
        endedAt: null,
      });

      const result = await service.adopt(
        { scheduleVersionId: 'v1' },
        adminA,
      );

      expect(result.tenantId).toBe('tenant-a');
      expect(prisma.tenantScheduleAdoption.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-a',
            scheduleVersionId: 'v1',
            adoptedBy: 'user-a',
          }),
        }),
      );
    });

    it('blocks PLATFORM_ADMIN from adopting for another tenant', async () => {
      await expect(
        service.adopt(
          { scheduleVersionId: 'v1', tenantId: 'tenant-b' },
          adminA,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects DRAFT adoption', async () => {
      prisma.tenant.findFirst.mockResolvedValue({ id: 'tenant-a' });
      prisma.scheduleVersion.findUnique.mockResolvedValue({
        id: 'v1',
        status: ScheduleVersionStatus.DRAFT,
      });

      await expect(
        service.adopt({ scheduleVersionId: 'v1' }, adminA),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects RETIRED new adoption', async () => {
      prisma.tenant.findFirst.mockResolvedValue({ id: 'tenant-a' });
      prisma.scheduleVersion.findUnique.mockResolvedValue({
        id: 'v1',
        status: ScheduleVersionStatus.RETIRED,
      });

      await expect(
        service.adopt({ scheduleVersionId: 'v1' }, adminA),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('prevents duplicate active adoption', async () => {
      prisma.tenant.findFirst.mockResolvedValue({ id: 'tenant-a' });
      prisma.scheduleVersion.findUnique.mockResolvedValue({
        id: 'v1',
        status: ScheduleVersionStatus.PUBLISHED,
      });
      prisma.tenantScheduleAdoption.findUnique.mockResolvedValue({
        id: 'adopt-1',
        endedAt: null,
      });

      await expect(
        service.adopt({ scheduleVersionId: 'v1' }, adminA),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('allows multiple published versions to be adopted', async () => {
      prisma.tenant.findFirst.mockResolvedValue({ id: 'tenant-a' });
      prisma.scheduleVersion.findUnique.mockResolvedValue({
        id: 'v2',
        status: ScheduleVersionStatus.PUBLISHED,
      });
      prisma.tenantScheduleAdoption.findUnique.mockResolvedValue(null);
      prisma.tenantScheduleAdoption.create.mockResolvedValue({
        id: 'adopt-2',
        scheduleVersionId: 'v2',
      });

      await expect(
        service.adopt({ scheduleVersionId: 'v2' }, adminA),
      ).resolves.toMatchObject({ scheduleVersionId: 'v2' });
    });

    it('enforces tenant isolation on getAdoption', async () => {
      prisma.tenantScheduleAdoption.findUnique.mockResolvedValue({
        id: 'adopt-1',
        tenantId: 'tenant-a',
      });

      await expect(
        service.getAdoption('adopt-1', adminB),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('patient assignment', () => {
    const patientProgram = {
      id: 'pp1',
      programId: PIH_CARE_PROGRAM_ID,
      patient: { id: 'p1', tenantId: 'tenant-a', isDeleted: false },
      program: { id: PIH_CARE_PROGRAM_ID, code: 'PIH_CARE', name: 'PIH' },
    };

    beforeEach(() => {
      prisma.patientProgram.findUnique.mockResolvedValue(patientProgram);
    });

    it('assigns adopted PUBLISHED version', async () => {
      prisma.scheduleVersion.findUnique.mockResolvedValue(
        publishedVersion('v1'),
      );
      prisma.tenantScheduleAdoption.findFirst.mockResolvedValue({
        id: 'adopt-1',
        endedAt: null,
      });
      prisma.patientScheduleAssignment.findFirst.mockResolvedValue(null);
      prisma.patientScheduleAssignment.create.mockResolvedValue({
        id: 'asg-1',
        patientProgramId: 'pp1',
        scheduleVersionId: 'v1',
        endedAt: null,
      });

      await expect(
        service.assignToPatientProgram(
          'pp1',
          { scheduleVersionId: 'v1' },
          adminA,
        ),
      ).resolves.toMatchObject({ scheduleVersionId: 'v1' });
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('assigns PIH PatientProgram to a PIH ScheduleVersion', async () => {
      prisma.scheduleVersion.findUnique.mockResolvedValue(
        publishedVersion('v-pih', PIH_CARE_PROGRAM_ID),
      );
      prisma.tenantScheduleAdoption.findFirst.mockResolvedValue({
        id: 'adopt-pih',
        endedAt: null,
      });
      prisma.patientScheduleAssignment.findFirst.mockResolvedValue(null);
      prisma.patientScheduleAssignment.create.mockResolvedValue({
        id: 'asg-pih',
        patientProgramId: 'pp1',
        scheduleVersionId: 'v-pih',
        endedAt: null,
      });

      await expect(
        service.assignToPatientProgram(
          'pp1',
          { scheduleVersionId: 'v-pih' },
          adminA,
        ),
      ).resolves.toMatchObject({ scheduleVersionId: 'v-pih' });
    });

    it('rejects PIH PatientProgram assigned to a NORMAL_PREGNANCY ScheduleVersion', async () => {
      prisma.scheduleVersion.findUnique.mockResolvedValue(
        publishedVersion('v-normal', NORMAL_PREGNANCY_PROGRAM_ID),
      );
      prisma.tenantScheduleAdoption.findFirst.mockResolvedValue({
        id: 'adopt-normal',
        endedAt: null,
      });

      await expect(
        service.assignToPatientProgram(
          'pp1',
          { scheduleVersionId: 'v-normal' },
          adminA,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.patientScheduleAssignment.create).not.toHaveBeenCalled();
    });

    it('rejects non-adopted version', async () => {
      prisma.scheduleVersion.findUnique.mockResolvedValue(publishedVersion('v1'));
      prisma.tenantScheduleAdoption.findFirst.mockResolvedValue(null);

      await expect(
        service.assignToPatientProgram(
          'pp1',
          { scheduleVersionId: 'v1' },
          adminA,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects DRAFT for new assignment', async () => {
      prisma.scheduleVersion.findUnique.mockResolvedValue({
        id: 'v1',
        status: ScheduleVersionStatus.DRAFT,
      });

      await expect(
        service.assignToPatientProgram(
          'pp1',
          { scheduleVersionId: 'v1' },
          adminA,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects RETIRED for new assignment', async () => {
      prisma.scheduleVersion.findUnique.mockResolvedValue({
        id: 'v1',
        status: ScheduleVersionStatus.RETIRED,
      });

      await expect(
        service.assignToPatientProgram(
          'pp1',
          { scheduleVersionId: 'v1' },
          adminA,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects cross-tenant patient program', async () => {
      prisma.patientProgram.findUnique.mockResolvedValue({
        ...patientProgram,
        patient: { id: 'p2', tenantId: 'tenant-b', isDeleted: false },
      });

      await expect(
        service.assignToPatientProgram(
          'pp1',
          { scheduleVersionId: 'v1' },
          adminA,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('enforces one active assignment', async () => {
      prisma.scheduleVersion.findUnique.mockResolvedValue(publishedVersion('v1'));
      prisma.tenantScheduleAdoption.findFirst.mockResolvedValue({
        id: 'adopt-1',
      });
      prisma.patientScheduleAssignment.findFirst.mockResolvedValue({
        id: 'asg-1',
        endedAt: null,
      });

      await expect(
        service.assignToPatientProgram(
          'pp1',
          { scheduleVersionId: 'v1' },
          adminA,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a second sequential assignment without migration', async () => {
      prisma.scheduleVersion.findUnique.mockResolvedValue(publishedVersion('v1'));
      prisma.tenantScheduleAdoption.findFirst.mockResolvedValue({
        id: 'adopt-1',
      });
      prisma.patientScheduleAssignment.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'asg-1', endedAt: null });
      prisma.patientScheduleAssignment.create.mockResolvedValue({
        id: 'asg-1',
        patientProgramId: 'pp1',
        scheduleVersionId: 'v1',
        endedAt: null,
      });

      await expect(
        service.assignToPatientProgram(
          'pp1',
          { scheduleVersionId: 'v1' },
          adminA,
        ),
      ).resolves.toMatchObject({ scheduleVersionId: 'v1' });

      await expect(
        service.assignToPatientProgram(
          'pp1',
          { scheduleVersionId: 'v1' },
          adminA,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.patientScheduleAssignment.create).toHaveBeenCalledTimes(1);
    });

    it('allows a new active assignment when only historical ended assignments exist', async () => {
      prisma.scheduleVersion.findUnique.mockResolvedValue(publishedVersion('v2'));
      prisma.tenantScheduleAdoption.findFirst.mockResolvedValue({
        id: 'adopt-2',
      });
      prisma.patientScheduleAssignment.findFirst.mockResolvedValue(null);
      prisma.patientScheduleAssignment.create.mockResolvedValue({
        id: 'asg-2',
        patientProgramId: 'pp1',
        scheduleVersionId: 'v2',
        endedAt: null,
      });

      await expect(
        service.assignToPatientProgram(
          'pp1',
          { scheduleVersionId: 'v2' },
          adminA,
        ),
      ).resolves.toMatchObject({ scheduleVersionId: 'v2', endedAt: null });
      expect(prisma.patientScheduleAssignment.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { patientProgramId: 'pp1', endedAt: null },
        }),
      );
    });

    it('concurrent assignment attempts cannot result in two active rows', async () => {
      prisma.scheduleVersion.findUnique.mockResolvedValue(publishedVersion('v1'));
      prisma.tenantScheduleAdoption.findFirst.mockResolvedValue({
        id: 'adopt-1',
      });
      prisma.patientScheduleAssignment.findFirst.mockResolvedValue(null);

      let createCalls = 0;
      prisma.patientScheduleAssignment.create.mockImplementation(
        async (args: { data: { scheduleVersionId: string } }) => {
          createCalls += 1;
          if (createCalls > 1) {
            throw uniqueConflictError();
          }
          return {
            id: 'asg-1',
            patientProgramId: 'pp1',
            scheduleVersionId: args.data.scheduleVersionId,
            endedAt: null,
          };
        },
      );

      const results = await Promise.allSettled([
        service.assignToPatientProgram(
          'pp1',
          { scheduleVersionId: 'v1' },
          adminA,
        ),
        service.assignToPatientProgram(
          'pp1',
          { scheduleVersionId: 'v1' },
          adminA,
        ),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(rejected[0]).toMatchObject({
        status: 'rejected',
        reason: expect.any(BadRequestException),
      });
      expect(createCalls).toBe(2);
      expect(
        fulfilled.filter(
          (r) =>
            r.status === 'fulfilled' && r.value.endedAt == null,
        ),
      ).toHaveLength(1);
    });

    it('rejects unauthorized roles', async () => {
      await expect(
        service.assignToPatientProgram(
          'pp1',
          { scheduleVersionId: 'v1' },
          { userId: 'd1', role: 'DOCTOR', tenantId: 'tenant-a' },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('assignment migration', () => {
    const patientProgram = {
      id: 'pp1',
      programId: PIH_CARE_PROGRAM_ID,
      patient: { id: 'p1', tenantId: 'tenant-a', isDeleted: false },
      program: { id: PIH_CARE_PROGRAM_ID, code: 'PIH_CARE', name: 'PIH' },
    };

    beforeEach(() => {
      prisma.patientProgram.findUnique.mockResolvedValue(patientProgram);
      prisma.scheduleVersion.findUnique.mockResolvedValue(
        publishedVersion('v2'),
      );
      prisma.tenantScheduleAdoption.findFirst.mockResolvedValue({
        id: 'adopt-2',
      });
    });

    it('closes current assignment and creates new active one transactionally', async () => {
      prisma.patientScheduleAssignment.findFirst.mockResolvedValue({
        id: 'asg-1',
        scheduleVersionId: 'v1',
        endedAt: null,
      });
      prisma.patientScheduleAssignment.update.mockResolvedValue({
        id: 'asg-1',
        endedAt: new Date(),
      });
      prisma.patientScheduleAssignment.create.mockResolvedValue({
        id: 'asg-2',
        scheduleVersionId: 'v2',
        endedAt: null,
      });

      const result = await service.migrateAssignment(
        'pp1',
        { scheduleVersionId: 'v2' },
        adminA,
      );

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.patientScheduleAssignment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'asg-1' },
          data: expect.objectContaining({ endedAt: expect.any(Date) }),
        }),
      );
      expect(result.scheduleVersionId).toBe('v2');
    });

    it('preserves old assignment id when migrating', async () => {
      prisma.patientScheduleAssignment.findFirst.mockResolvedValue({
        id: 'asg-old',
        scheduleVersionId: 'v1',
        endedAt: null,
      });
      prisma.patientScheduleAssignment.update.mockResolvedValue({
        id: 'asg-old',
      });
      prisma.patientScheduleAssignment.create.mockResolvedValue({
        id: 'asg-new',
        scheduleVersionId: 'v2',
      });

      await service.migrateAssignment(
        'pp1',
        { scheduleVersionId: 'v2' },
        adminA,
      );

      expect(prisma.patientScheduleAssignment.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'asg-old' } }),
      );
      expect(prisma.patientScheduleAssignment.create).toHaveBeenCalled();
    });

    it('rejects migration to non-adopted version', async () => {
      prisma.tenantScheduleAdoption.findFirst.mockResolvedValue(null);

      await expect(
        service.migrateAssignment(
          'pp1',
          { scheduleVersionId: 'v2' },
          adminA,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects migration to DRAFT', async () => {
      prisma.scheduleVersion.findUnique.mockResolvedValue({
        id: 'v2',
        status: ScheduleVersionStatus.DRAFT,
      });

      await expect(
        service.migrateAssignment(
          'pp1',
          { scheduleVersionId: 'v2' },
          adminA,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects migration to RETIRED', async () => {
      prisma.scheduleVersion.findUnique.mockResolvedValue({
        id: 'v2',
        status: ScheduleVersionStatus.RETIRED,
      });

      await expect(
        service.migrateAssignment(
          'pp1',
          { scheduleVersionId: 'v2' },
          adminA,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects migration from a PIH version to a NORMAL_PREGNANCY version', async () => {
      prisma.scheduleVersion.findUnique.mockResolvedValue(
        publishedVersion('v-normal', NORMAL_PREGNANCY_PROGRAM_ID),
      );
      prisma.tenantScheduleAdoption.findFirst.mockResolvedValue({
        id: 'adopt-normal',
      });
      prisma.patientScheduleAssignment.findFirst.mockResolvedValue({
        id: 'asg-1',
        scheduleVersionId: 'v-pih',
        endedAt: null,
      });

      await expect(
        service.migrateAssignment(
          'pp1',
          { scheduleVersionId: 'v-normal' },
          adminA,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('leaves the current assignment unchanged when care program migration is rejected', async () => {
      prisma.scheduleVersion.findUnique.mockResolvedValue(
        publishedVersion('v-normal', NORMAL_PREGNANCY_PROGRAM_ID),
      );
      prisma.tenantScheduleAdoption.findFirst.mockResolvedValue({
        id: 'adopt-normal',
      });
      prisma.patientScheduleAssignment.findFirst.mockResolvedValue({
        id: 'asg-1',
        scheduleVersionId: 'v-pih',
        endedAt: null,
      });

      await expect(
        service.migrateAssignment(
          'pp1',
          { scheduleVersionId: 'v-normal' },
          adminA,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.patientScheduleAssignment.update).not.toHaveBeenCalled();
      expect(prisma.patientScheduleAssignment.create).not.toHaveBeenCalled();
    });
  });

  describe('retirement behavior', () => {
    it('does not require deleting adoption when version is retired', async () => {
      // Existing adoption/assignment records remain addressable; retirement only
      // blocks NEW adopt/assign via status checks already covered above.
      prisma.tenantScheduleAdoption.findUnique.mockResolvedValue({
        id: 'adopt-1',
        tenantId: 'tenant-a',
        scheduleVersionId: 'v1',
        endedAt: null,
      });

      await expect(
        service.getAdoption('adopt-1', adminA),
      ).resolves.toMatchObject({ id: 'adopt-1', endedAt: null });
    });
  });
});
