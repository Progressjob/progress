import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  ApplicationsService,
  assertApplicationTransition,
  canReapplyExistingApplication,
} from './applications.service';
import { PrismaService } from '../../prisma/prisma.service';

function futureDeadline(): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 14);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function pastDeadline(): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 2);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function createPrismaMock() {
  const prisma: any = {
    candidateProfile: { findUnique: vi.fn() },
    job: { findUnique: vi.fn(), update: vi.fn() },
    candidateResume: { findFirst: vi.fn() },
    application: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    applicationAnswer: { deleteMany: vi.fn() },
    applicationEvent: { create: vi.fn() },
    notification: { create: vi.fn(), createMany: vi.fn() },
    companyMember: { findFirst: vi.fn(), findMany: vi.fn() },
    user: { findUnique: vi.fn() },
    interview: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(async (fn: (tx: typeof prisma) => unknown) => fn(prisma)),
  };
  return prisma;
}

describe('ApplicationsService.apply', () => {
  it('creates an application and notifies company members', async () => {
    const prisma = createPrismaMock();
    prisma.candidateProfile.findUnique.mockResolvedValue({
      id: 'cand-1',
      userId: 'user-1',
      applicationsBlocked: false,
    });
    prisma.job.findUnique.mockResolvedValue({
      id: 'job-1',
      title: 'Nurse',
      status: 'published',
      companyId: 'co-1',
      applicationDeadline: futureDeadline(),
      company: { members: [{ userId: 'owner-1' }] },
      screeningQuestions: [],
    });
    prisma.application.findUnique.mockResolvedValue(null);
    prisma.application.create.mockResolvedValue({
      id: 'app-1',
      jobId: 'job-1',
      candidateId: 'cand-1',
      status: 'submitted',
    });
    prisma.user.findUnique.mockResolvedValue({ firstName: 'Sura', lastName: 'Nega' });
    prisma.companyMember.findMany.mockResolvedValue([{ userId: 'owner-1' }]);

    const service = new ApplicationsService(prisma as unknown as PrismaService);
    const result = await service.apply('user-1', 'job-1', { answers: [] });

    expect(result.id).toBe('app-1');
    expect(prisma.application.create).toHaveBeenCalled();
    expect(prisma.applicationEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ newStatus: 'submitted' }),
      }),
    );
    expect(prisma.notification.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            userId: 'owner-1',
            type: 'application_update',
            referenceType: 'candidates',
            referenceId: 'co-1:app-1',
          }),
        ],
      }),
    );
  });

  it('rejects duplicate applications', async () => {
    const prisma = createPrismaMock();
    prisma.candidateProfile.findUnique.mockResolvedValue({
      id: 'cand-1',
      userId: 'user-1',
      applicationsBlocked: false,
    });
    prisma.job.findUnique.mockResolvedValue({
      id: 'job-1',
      title: 'Nurse',
      status: 'published',
      companyId: 'co-1',
      applicationDeadline: futureDeadline(),
      company: { members: [] },
      screeningQuestions: [],
    });
    prisma.application.findUnique.mockResolvedValue({
      id: 'app-existing',
      status: 'submitted',
    });

    const service = new ApplicationsService(prisma as unknown as PrismaService);
    await expect(service.apply('user-1', 'job-1', { answers: [] })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('allows reapply after rejection and sets resubmittedAt', async () => {
    const prisma = createPrismaMock();
    prisma.candidateProfile.findUnique.mockResolvedValue({
      id: 'cand-1',
      userId: 'user-1',
      applicationsBlocked: false,
    });
    prisma.job.findUnique.mockResolvedValue({
      id: 'job-1',
      title: 'Nurse',
      status: 'published',
      companyId: 'co-1',
      applicationDeadline: futureDeadline(),
      company: { members: [{ userId: 'owner-1' }] },
      screeningQuestions: [],
    });
    prisma.application.findUnique.mockResolvedValue({
      id: 'app-1',
      status: 'rejected',
      candidateId: 'cand-1',
      jobId: 'job-1',
    });
    prisma.application.update.mockResolvedValue({
      id: 'app-1',
      jobId: 'job-1',
      candidateId: 'cand-1',
      status: 'submitted',
      resubmittedAt: new Date(),
    });
    prisma.user.findUnique.mockResolvedValue({ firstName: 'Sura', lastName: 'Nega' });
    prisma.companyMember.findMany.mockResolvedValue([{ userId: 'owner-1' }]);

    const service = new ApplicationsService(prisma as unknown as PrismaService);
    const result = await service.apply('user-1', 'job-1', {
      resumeId: undefined,
      answers: [],
    });

    expect(result.id).toBe('app-1');
    expect(prisma.applicationAnswer.deleteMany).toHaveBeenCalledWith({
      where: { applicationId: 'app-1' },
    });
    expect(prisma.application.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'app-1' },
        data: expect.objectContaining({
          status: 'submitted',
          resubmittedAt: expect.any(Date),
        }),
      }),
    );
    expect(prisma.applicationEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          oldStatus: 'rejected',
          newStatus: 'submitted',
          note: 'Application resubmitted',
        }),
      }),
    );
    expect(prisma.notification.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            title: 'Application resubmitted',
            referenceType: 'candidates',
            referenceId: 'co-1:app-1',
          }),
        ],
      }),
    );
  });

  it('blocks applications when the candidate is blocked', async () => {
    const prisma = createPrismaMock();
    prisma.candidateProfile.findUnique.mockResolvedValue({
      id: 'cand-1',
      userId: 'user-1',
      applicationsBlocked: true,
    });
    const service = new ApplicationsService(prisma as unknown as PrismaService);
    await expect(service.apply('user-1', 'job-1', { answers: [] })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects apply after the deadline', async () => {
    const prisma = createPrismaMock();
    prisma.candidateProfile.findUnique.mockResolvedValue({
      id: 'cand-1',
      userId: 'user-1',
      applicationsBlocked: false,
    });
    prisma.job.findUnique.mockResolvedValue({
      id: 'job-1',
      title: 'Nurse',
      status: 'published',
      companyId: 'co-1',
      applicationDeadline: pastDeadline(),
      company: { members: [] },
      screeningQuestions: [],
    });
    const service = new ApplicationsService(prisma as unknown as PrismaService);
    await expect(service.apply('user-1', 'job-1', { answers: [] })).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });
});

describe('ApplicationsService.sendMessage', () => {
  it('writes a same-status event and notifies the candidate', async () => {
    const prisma = createPrismaMock();
    prisma.companyMember.findFirst.mockResolvedValue({ id: 'mem-1' });
    prisma.application.findFirst.mockResolvedValue({
      id: 'app-1',
      status: 'reviewing',
      candidateId: 'cand-1',
      job: { title: 'Nurse', companyId: 'co-1' },
      candidate: { userId: 'cand-user', user: { firstName: 'Sura', lastName: 'Nega' } },
      events: [],
      interviews: [],
      answers: [],
      resume: null,
    });
    prisma.applicationEvent.create.mockResolvedValue({
      id: 'evt-1',
      note: 'Please send certificates',
      oldStatus: 'reviewing',
      newStatus: 'reviewing',
    });

    const service = new ApplicationsService(prisma as unknown as PrismaService);
    await service.sendMessage('owner-1', 'co-1', 'app-1', { body: 'Please send certificates' });

    expect(prisma.applicationEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          oldStatus: 'reviewing',
          newStatus: 'reviewing',
          note: 'Please send certificates',
        }),
      }),
    );
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'cand-user',
          type: 'application_update',
          referenceType: 'application',
          referenceId: 'app-1',
        }),
      }),
    );
  });
});

describe('ApplicationsService.changeStatus', () => {
  it('requires a rejection reason', async () => {
    const prisma = createPrismaMock();
    prisma.companyMember.findFirst.mockResolvedValue({ id: 'mem-1' });
    prisma.application.findFirst.mockResolvedValue({
      id: 'app-1',
      status: 'reviewing',
      candidateId: 'cand-1',
      job: { title: 'Nurse', companyId: 'co-1' },
      candidate: { userId: 'cand-user', user: { firstName: 'Sura', lastName: 'Nega' } },
      events: [],
      interviews: [],
      answers: [],
      resume: null,
    });

    const service = new ApplicationsService(prisma as unknown as PrismaService);
    await expect(
      service.changeStatus('owner-1', 'co-1', 'app-1', { status: 'rejected' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks marking interview without scheduling', async () => {
    const prisma = createPrismaMock();
    prisma.companyMember.findFirst.mockResolvedValue({ id: 'mem-1' });
    prisma.application.findFirst.mockResolvedValue({
      id: 'app-1',
      status: 'reviewing',
      candidateId: 'cand-1',
      job: { title: 'Nurse', companyId: 'co-1' },
      candidate: { userId: 'cand-user', user: { firstName: 'Sura', lastName: 'Nega' } },
      events: [],
      interviews: [],
      answers: [],
      resume: null,
    });

    const service = new ApplicationsService(prisma as unknown as PrismaService);
    await expect(
      service.changeStatus('owner-1', 'co-1', 'app-1', { status: 'interview' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects with a reason and notifies the candidate', async () => {
    const prisma = createPrismaMock();
    prisma.companyMember.findFirst.mockResolvedValue({ id: 'mem-1' });
    prisma.application.findFirst.mockResolvedValue({
      id: 'app-1',
      status: 'reviewing',
      candidateId: 'cand-1',
      job: { title: 'Nurse', companyId: 'co-1' },
      candidate: { userId: 'cand-user', user: { firstName: 'Sura', lastName: 'Nega' } },
      events: [],
      interviews: [],
      answers: [],
      resume: null,
    });
    prisma.application.update.mockResolvedValue({
      id: 'app-1',
      status: 'rejected',
      candidate: { userId: 'cand-user' },
      job: { title: 'Nurse' },
    });

    const service = new ApplicationsService(prisma as unknown as PrismaService);
    await service.changeStatus('owner-1', 'co-1', 'app-1', {
      status: 'rejected',
      note: 'Missing warehouse experience',
    });

    expect(prisma.applicationEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          oldStatus: 'reviewing',
          newStatus: 'rejected',
          note: 'Missing warehouse experience',
        }),
      }),
    );
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'cand-user',
          title: 'Application rejected',
          message: expect.stringContaining('Rejection reason: Missing warehouse experience'),
          referenceType: 'application',
          referenceId: 'app-1',
        }),
      }),
    );
  });
});

describe('application transitions', () => {
  it('allows the normal pipeline', () => {
    expect(() => assertApplicationTransition('submitted', 'reviewing')).not.toThrow();
    expect(() => assertApplicationTransition('interview', 'offered')).not.toThrow();
  });

  it('blocks terminal moves', () => {
    expect(() => assertApplicationTransition('hired', 'rejected')).toThrow();
  });
});

describe('canReapplyExistingApplication', () => {
  it('allows rejected always', () => {
    expect(
      canReapplyExistingApplication(
        { status: 'rejected', updatedAt: new Date('2026-01-01') },
        { postedAt: new Date('2025-01-01') },
      ),
    ).toBe(true);
  });

  it('allows hired only after republish bumps postedAt', () => {
    expect(
      canReapplyExistingApplication(
        { status: 'hired', updatedAt: new Date('2026-01-10') },
        { postedAt: new Date('2026-01-01') },
      ),
    ).toBe(false);
    expect(
      canReapplyExistingApplication(
        { status: 'hired', updatedAt: new Date('2026-01-10') },
        { postedAt: new Date('2026-02-01') },
      ),
    ).toBe(true);
  });
});

describe('ApplicationsService.changeStatus fill-close', () => {
  it('closes the job when hired count reaches vacanciesCount', async () => {
    const prisma = createPrismaMock();
    prisma.companyMember.findFirst.mockResolvedValue({ id: 'mem-1' });
    prisma.application.findFirst.mockResolvedValue({
      id: 'app-1',
      status: 'offered',
      candidateId: 'cand-1',
      jobId: 'job-1',
      job: { title: 'Nurse', companyId: 'co-1', vacanciesCount: 1, status: 'published' },
      candidate: { userId: 'cand-user', user: { firstName: 'Sura', lastName: 'Nega' } },
      events: [],
      interviews: [],
      answers: [],
      resume: null,
    });
    prisma.application.update.mockResolvedValue({
      id: 'app-1',
      status: 'hired',
      jobId: 'job-1',
      candidate: { userId: 'cand-user' },
      job: { title: 'Nurse', vacanciesCount: 1, status: 'published' },
    });
    prisma.application.count.mockResolvedValue(1);

    const service = new ApplicationsService(prisma as unknown as PrismaService);
    await service.changeStatus('owner-1', 'co-1', 'app-1', { status: 'hired' });

    expect(prisma.application.count).toHaveBeenCalledWith({
      where: { jobId: 'job-1', status: 'hired' },
    });
    expect(prisma.job.update).toHaveBeenCalledWith({
      where: { id: 'job-1' },
      data: { status: 'closed' },
    });
  });

  it('leaves the job published when openings remain', async () => {
    const prisma = createPrismaMock();
    prisma.companyMember.findFirst.mockResolvedValue({ id: 'mem-1' });
    prisma.application.findFirst.mockResolvedValue({
      id: 'app-1',
      status: 'offered',
      candidateId: 'cand-1',
      jobId: 'job-1',
      job: { title: 'Nurse', companyId: 'co-1', vacanciesCount: 2, status: 'published' },
      candidate: { userId: 'cand-user', user: { firstName: 'Sura', lastName: 'Nega' } },
      events: [],
      interviews: [],
      answers: [],
      resume: null,
    });
    prisma.application.update.mockResolvedValue({
      id: 'app-1',
      status: 'hired',
      jobId: 'job-1',
      candidate: { userId: 'cand-user' },
      job: { title: 'Nurse', vacanciesCount: 2, status: 'published' },
    });
    prisma.application.count.mockResolvedValue(1);

    const service = new ApplicationsService(prisma as unknown as PrismaService);
    await service.changeStatus('owner-1', 'co-1', 'app-1', { status: 'hired' });

    expect(prisma.job.update).not.toHaveBeenCalled();
  });
});

describe('ApplicationsService.apply hired reapply', () => {
  it('blocks hired reapply before republish', async () => {
    const prisma = createPrismaMock();
    prisma.candidateProfile.findUnique.mockResolvedValue({
      id: 'cand-1',
      userId: 'user-1',
      applicationsBlocked: false,
    });
    prisma.job.findUnique.mockResolvedValue({
      id: 'job-1',
      title: 'Nurse',
      status: 'published',
      companyId: 'co-1',
      postedAt: new Date('2026-01-01'),
      applicationDeadline: futureDeadline(),
      company: { members: [] },
      screeningQuestions: [],
    });
    prisma.application.findUnique.mockResolvedValue({
      id: 'app-1',
      status: 'hired',
      updatedAt: new Date('2026-01-15'),
    });

    const service = new ApplicationsService(prisma as unknown as PrismaService);
    await expect(service.apply('user-1', 'job-1', { answers: [] })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('allows hired reapply after republish bumps postedAt', async () => {
    const prisma = createPrismaMock();
    prisma.candidateProfile.findUnique.mockResolvedValue({
      id: 'cand-1',
      userId: 'user-1',
      applicationsBlocked: false,
    });
    prisma.job.findUnique.mockResolvedValue({
      id: 'job-1',
      title: 'Nurse',
      status: 'published',
      companyId: 'co-1',
      postedAt: new Date('2026-02-01'),
      applicationDeadline: futureDeadline(),
      company: { members: [{ userId: 'owner-1' }] },
      screeningQuestions: [],
    });
    prisma.application.findUnique.mockResolvedValue({
      id: 'app-1',
      status: 'hired',
      updatedAt: new Date('2026-01-15'),
    });
    prisma.application.update.mockResolvedValue({
      id: 'app-1',
      jobId: 'job-1',
      candidateId: 'cand-1',
      status: 'submitted',
    });
    prisma.user.findUnique.mockResolvedValue({ firstName: 'Sura', lastName: 'Nega' });
    prisma.companyMember.findMany.mockResolvedValue([{ userId: 'owner-1' }]);

    const service = new ApplicationsService(prisma as unknown as PrismaService);
    const result = await service.apply('user-1', 'job-1', { answers: [] });

    expect(result.id).toBe('app-1');
    expect(prisma.applicationEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          oldStatus: 'hired',
          newStatus: 'submitted',
          note: 'Application resubmitted after vacancy republish',
        }),
      }),
    );
  });
});
