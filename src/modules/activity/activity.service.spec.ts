import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ActivityService } from './activity.service';

describe('ActivityService', () => {
  let service: ActivityService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      activity: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      content: {
        findUnique: jest.fn(),
      },
      activityContent: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new ActivityService(prisma);
  });

  it('creates an activity', async () => {
    prisma.activity.findUnique.mockResolvedValue(null);
    prisma.activity.create.mockResolvedValue({
      id: 'a1',
      code: 'EXERCISE_A',
      title: 'Prenatal Exercise A',
      type: 'EXERCISE',
      isActive: true,
    });

    const result = await service.create({
      code: 'exercise_a',
      title: 'Prenatal Exercise A',
      type: 'EXERCISE' as any,
    });

    expect(prisma.activity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ code: 'EXERCISE_A' }),
      }),
    );
    expect(result.code).toBe('EXERCISE_A');
  });

  it('rejects duplicate activity code', async () => {
    prisma.activity.findUnique.mockResolvedValue({ id: 'a1', code: 'EXERCISE_A' });

    await expect(
      service.create({
        code: 'EXERCISE_A',
        title: 'Prenatal Exercise A',
        type: 'EXERCISE' as any,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lists and gets activities', async () => {
    prisma.activity.findMany.mockResolvedValue([{ id: 'a1' }]);
    prisma.activity.findUnique.mockResolvedValue({
      id: 'a1',
      contents: [],
    });

    await expect(service.findAll({})).resolves.toEqual([{ id: 'a1' }]);
    await expect(service.findOne('a1')).resolves.toEqual({
      id: 'a1',
      contents: [],
    });
  });

  it('throws when activity not found', async () => {
    prisma.activity.findUnique.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates an activity', async () => {
    prisma.activity.findUnique
      .mockResolvedValueOnce({ id: 'a1', code: 'EXERCISE_A' })
      .mockResolvedValueOnce(null);
    prisma.activity.update.mockResolvedValue({
      id: 'a1',
      code: 'EXERCISE_A2',
      title: 'Updated',
    });

    const result = await service.update('a1', {
      code: 'EXERCISE_A2',
      title: 'Updated',
    });
    expect(result.title).toBe('Updated');
  });

  it('attaches content and rejects duplicates', async () => {
    prisma.activity.findUnique.mockResolvedValue({ id: 'a1' });
    prisma.content.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.activityContent.findUnique.mockResolvedValue(null);
    prisma.activityContent.create.mockResolvedValue({
      id: 'ac1',
      activityId: 'a1',
      contentId: 'c1',
    });

    await expect(
      service.attachContent('a1', { contentId: 'c1' }),
    ).resolves.toMatchObject({ contentId: 'c1' });

    prisma.activityContent.findUnique.mockResolvedValue({ id: 'ac1' });
    await expect(
      service.attachContent('a1', { contentId: 'c1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('detaches content', async () => {
    prisma.activityContent.findUnique.mockResolvedValue({ id: 'ac1' });
    prisma.activityContent.delete.mockResolvedValue({});

    await expect(service.detachContent('a1', 'c1')).resolves.toEqual({
      message: 'Content detached from activity',
    });
  });
});
