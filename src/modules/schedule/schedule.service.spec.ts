import { BadRequestException } from '@nestjs/common';
import { ScheduleVersionStatus } from '@prisma/client';
import { ScheduleService } from './schedule.service';

describe('ScheduleService', () => {
  let service: ScheduleService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      careProgram: { findUnique: jest.fn() },
      scheduleTemplate: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      scheduleVersion: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      scheduleRule: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      scheduleRuleItem: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      activity: { findUnique: jest.fn() },
      $transaction: jest.fn(async (ops) => {
        if (Array.isArray(ops)) {
          return Promise.all(ops);
        }
        return ops(prisma);
      }),
    };
    service = new ScheduleService(prisma);
  });

  it('creates template and rejects duplicate code', async () => {
    prisma.careProgram.findUnique.mockResolvedValue({ id: 'cp1' });
    prisma.scheduleTemplate.findUnique.mockResolvedValue(null);
    prisma.scheduleTemplate.create.mockResolvedValue({
      id: 't1',
      code: 'PIH_STANDARD_INTERVENTION',
    });

    await expect(
      service.createTemplate({
        careProgramId: 'cp1',
        name: 'PIH Standard Intervention',
        code: 'pih_standard_intervention',
      }),
    ).resolves.toMatchObject({ code: 'PIH_STANDARD_INTERVENTION' });

    prisma.scheduleTemplate.findUnique.mockResolvedValue({ id: 't1' });
    await expect(
      service.createTemplate({
        careProgramId: 'cp1',
        name: 'PIH Standard Intervention',
        code: 'PIH_STANDARD_INTERVENTION',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates DRAFT version with next version number', async () => {
    prisma.scheduleTemplate.findUnique.mockResolvedValue({ id: 't1' });
    prisma.scheduleVersion.findFirst.mockResolvedValue({ versionNumber: 1 });
    prisma.scheduleVersion.findUnique.mockResolvedValue(null);
    prisma.scheduleVersion.create.mockResolvedValue({
      id: 'v2',
      versionNumber: 2,
      status: ScheduleVersionStatus.DRAFT,
    });

    const result = await service.createVersion('t1', {});
    expect(result.versionNumber).toBe(2);
    expect(result.status).toBe(ScheduleVersionStatus.DRAFT);
  });

  it('rejects invalid rule ranges', async () => {
    prisma.scheduleVersion.findUnique.mockResolvedValue({
      id: 'v1',
      status: ScheduleVersionStatus.DRAFT,
    });

    await expect(
      service.createRule('v1', {
        startInterventionDay: 5,
        endInterventionDay: 2,
        ruleType: 'REPEAT' as any,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates REPEAT and SEQUENCE rules on DRAFT versions', async () => {
    prisma.scheduleVersion.findUnique.mockResolvedValue({
      id: 'v1',
      status: ScheduleVersionStatus.DRAFT,
    });
    prisma.scheduleRule.create.mockResolvedValue({ id: 'r1', ruleType: 'REPEAT' });

    await expect(
      service.createRule('v1', {
        startInterventionDay: 1,
        endInterventionDay: 12,
        ruleType: 'REPEAT' as any,
      }),
    ).resolves.toMatchObject({ ruleType: 'REPEAT' });

    prisma.scheduleRule.create.mockResolvedValue({
      id: 'r2',
      ruleType: 'SEQUENCE',
    });
    await expect(
      service.createRule('v1', {
        startInterventionDay: 13,
        endInterventionDay: 18,
        ruleType: 'SEQUENCE' as any,
      }),
    ).resolves.toMatchObject({ ruleType: 'SEQUENCE' });
  });

  it('blocks edits on published versions', async () => {
    prisma.scheduleVersion.findUnique.mockResolvedValue({
      id: 'v1',
      status: ScheduleVersionStatus.PUBLISHED,
    });

    await expect(
      service.updateVersion('v1', { name: 'x' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.createRule('v1', {
        startInterventionDay: 1,
        endInterventionDay: 2,
        ruleType: 'REPEAT' as any,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('publishes a valid DRAFT version', async () => {
    const draft = {
      id: 'v1',
      status: ScheduleVersionStatus.DRAFT,
      rules: [
        {
          id: 'r1',
          startInterventionDay: 1,
          endInterventionDay: 12,
          ruleType: 'REPEAT',
          items: [
            { position: 1, activity: { code: 'EXERCISE_A', isActive: true } },
            { position: 2, activity: { code: 'EXERCISE_B', isActive: true } },
            { position: 3, activity: { code: 'EXERCISE_C', isActive: true } },
            { position: 4, activity: { code: 'MUSIC_A', isActive: true } },
            { position: 5, activity: { code: 'MUSIC_B', isActive: true } },
            { position: 6, activity: { code: 'MUSIC_C', isActive: true } },
          ],
        },
      ],
    };

    prisma.scheduleVersion.findUnique.mockResolvedValue(draft);
    prisma.scheduleVersion.update.mockResolvedValue({
      ...draft,
      status: ScheduleVersionStatus.PUBLISHED,
    });

    await expect(service.publishVersion('v1')).resolves.toMatchObject({
      status: ScheduleVersionStatus.PUBLISHED,
    });
  });

  it('rejects publish when inactive activity is referenced', async () => {
    prisma.scheduleVersion.findUnique.mockResolvedValue({
      id: 'v1',
      status: ScheduleVersionStatus.DRAFT,
      rules: [
        {
          id: 'r1',
          startInterventionDay: 1,
          endInterventionDay: 1,
          ruleType: 'SEQUENCE',
          items: [
            { position: 1, activity: { code: 'EXERCISE_A', isActive: false } },
          ],
        },
      ],
    });

    await expect(service.publishVersion('v1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects publish with no rules', async () => {
    prisma.scheduleVersion.findUnique.mockResolvedValue({
      id: 'v1',
      status: ScheduleVersionStatus.DRAFT,
      rules: [],
    });

    await expect(service.publishVersion('v1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('retires published versions and blocks republish/edit of retired', async () => {
    prisma.scheduleVersion.findUnique.mockResolvedValue({
      id: 'v1',
      status: ScheduleVersionStatus.PUBLISHED,
    });
    prisma.scheduleVersion.update.mockResolvedValue({
      id: 'v1',
      status: ScheduleVersionStatus.RETIRED,
    });

    await expect(service.retireVersion('v1')).resolves.toMatchObject({
      status: ScheduleVersionStatus.RETIRED,
    });

    prisma.scheduleVersion.findUnique.mockResolvedValue({
      id: 'v1',
      status: ScheduleVersionStatus.RETIRED,
      rules: [
        {
          id: 'r1',
          startInterventionDay: 1,
          endInterventionDay: 1,
          ruleType: 'SEQUENCE',
          items: [
            { position: 1, activity: { code: 'EXERCISE_A', isActive: true } },
          ],
        },
      ],
    });

    await expect(service.publishVersion('v1')).rejects.toBeInstanceOf(
      BadRequestException,
    );

    prisma.scheduleVersion.findUnique.mockResolvedValue({
      id: 'v1',
      status: ScheduleVersionStatus.RETIRED,
    });
    await expect(
      service.updateVersion('v1', { name: 'x' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates ordered rule items', async () => {
    prisma.scheduleRule.findUnique.mockResolvedValue({
      id: 'r1',
      scheduleVersion: { status: ScheduleVersionStatus.DRAFT },
    });
    prisma.activity.findUnique.mockResolvedValue({ id: 'a1', isActive: true });
    prisma.scheduleRuleItem.findUnique.mockResolvedValue(null);
    prisma.scheduleRuleItem.create.mockResolvedValue({
      id: 'i1',
      position: 1,
      activityId: 'a1',
    });

    await expect(
      service.createRuleItem('r1', { activityId: 'a1', position: 1 }),
    ).resolves.toMatchObject({ position: 1 });
  });
});
