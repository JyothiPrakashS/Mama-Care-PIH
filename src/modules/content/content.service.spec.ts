import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ContentService } from './content.service';

describe('ContentService', () => {
  let service: ContentService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      content: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new ContentService(prisma);
  });

  it('creates content', async () => {
    prisma.content.findUnique.mockResolvedValue(null);
    prisma.content.create.mockResolvedValue({
      id: 'c1',
      code: 'MUSIC_A_INTRO_LINK',
      type: 'LINK',
    });

    const result = await service.create({
      code: 'music_a_intro_link',
      title: 'Music Therapy A Intro',
      type: 'LINK' as any,
    });

    expect(result.code).toBe('MUSIC_A_INTRO_LINK');
  });

  it('rejects duplicate content code', async () => {
    prisma.content.findUnique.mockResolvedValue({ id: 'c1' });
    await expect(
      service.create({
        code: 'MUSIC_A_INTRO_LINK',
        title: 'x',
        type: 'LINK' as any,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lists and gets content', async () => {
    prisma.content.findMany.mockResolvedValue([{ id: 'c1' }]);
    prisma.content.findUnique.mockResolvedValue({ id: 'c1' });

    await expect(service.findAll({})).resolves.toEqual([{ id: 'c1' }]);
    await expect(service.findOne('c1')).resolves.toEqual({ id: 'c1' });
  });

  it('throws when content missing', async () => {
    prisma.content.findUnique.mockResolvedValue(null);
    await expect(service.findOne('x')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates content', async () => {
    prisma.content.findUnique.mockResolvedValue({
      id: 'c1',
      code: 'MUSIC_A_INTRO_LINK',
    });
    prisma.content.update.mockResolvedValue({
      id: 'c1',
      title: 'Updated',
    });

    await expect(
      service.update('c1', { title: 'Updated' }),
    ).resolves.toMatchObject({ title: 'Updated' });
  });
});
