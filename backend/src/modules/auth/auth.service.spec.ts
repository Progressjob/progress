import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';

function createPrismaMock() {
  const prisma: any = {
    role: { findUnique: vi.fn() },
    user: { findUniqueOrThrow: vi.fn() },
    userRole: { upsert: vi.fn() },
    candidateProfile: { findUnique: vi.fn(), create: vi.fn() },
    company: { findUnique: vi.fn(), create: vi.fn() },
    companyMember: { create: vi.fn() },
    $transaction: vi.fn(async (fn: (tx: typeof prisma) => unknown) => fn(prisma)),
  };
  return prisma;
}

describe('AuthService role enablement', () => {
  const jwt = {} as JwtService;
  const config = {} as ConfigService;

  it('enableCandidate upserts the role and creates a missing profile', async () => {
    const prisma = createPrismaMock();
    prisma.role.findUnique.mockResolvedValue({ id: 4, name: 'candidate' });
    prisma.candidateProfile.findUnique.mockResolvedValue(null);
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      id: 'user-1',
      roles: [{ role: { name: 'employer' } }, { role: { name: 'candidate' } }],
      candidateProfile: { id: 'profile-1', applicationsBlocked: false },
      companyMemberships: [],
    });

    const service = new AuthService(prisma, jwt, config);
    const me = await service.enableCandidate('user-1');

    expect(prisma.userRole.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { userId: 'user-1', roleId: 4 },
      }),
    );
    expect(prisma.candidateProfile.create).toHaveBeenCalledWith({ data: { userId: 'user-1' } });
    expect(me.candidateProfile?.id).toBe('profile-1');
  });

  it('enableEmployer is idempotent when a membership already exists', async () => {
    const prisma = createPrismaMock();
    const company = { id: 'co-1', name: 'Acme' };
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      id: 'user-1',
      firstName: 'Abebe',
      lastName: 'Kebede',
      email: 'abebe@example.com',
      companyMemberships: [{ company }],
    });
    prisma.role.findUnique.mockResolvedValue({ id: 3, name: 'employer' });

    const service = new AuthService(prisma, jwt, config);
    const result = await service.enableEmployer('user-1', { name: 'Acme' });

    expect(result).toEqual({ company, created: false });
    expect(prisma.company.create).not.toHaveBeenCalled();
    expect(prisma.userRole.upsert).toHaveBeenCalled();
  });

  it('enableEmployer creates a pending hiring identity on first use', async () => {
    const prisma = createPrismaMock();
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      id: 'user-1',
      firstName: 'Abebe',
      lastName: 'Kebede',
      email: 'abebe@example.com',
      companyMemberships: [],
    });
    prisma.role.findUnique.mockResolvedValue({ id: 3, name: 'employer' });
    prisma.company.findUnique.mockResolvedValue(null);
    prisma.company.create.mockResolvedValue({
      id: 'co-new',
      name: 'Abebe Hiring',
      verificationStatus: 'pending',
    });

    const service = new AuthService(prisma, jwt, config);
    const result = await service.enableEmployer('user-1', { name: 'Abebe Hiring' });

    expect(result.created).toBe(true);
    expect(prisma.company.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Abebe Hiring',
          verificationStatus: 'pending',
          canSelfPublishJobs: false,
        }),
      }),
    );
    expect(prisma.companyMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'user-1', memberRole: 'owner' }),
      }),
    );
  });

  it('enableEmployer fails when roles are not seeded', async () => {
    const prisma = createPrismaMock();
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      id: 'user-1',
      firstName: 'Abebe',
      lastName: 'Kebede',
      email: 'abebe@example.com',
      companyMemberships: [],
    });
    prisma.role.findUnique.mockResolvedValue(null);

    const service = new AuthService(prisma, jwt, config);
    await expect(service.enableEmployer('user-1', { name: 'Acme' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
