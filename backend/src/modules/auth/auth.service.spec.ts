import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { googleIdTokenVerifier, type GoogleIdentity } from './google-token';

function createPrismaMock() {
  const prisma: any = {
    role: { findUnique: vi.fn() },
    user: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), create: vi.fn(), update: vi.fn() },
    refreshToken: { create: vi.fn(), update: vi.fn() },
    userRole: { upsert: vi.fn() },
    candidateProfile: { findUnique: vi.fn(), create: vi.fn() },
    company: { findUnique: vi.fn(), create: vi.fn() },
    companyMember: { create: vi.fn() },
    file: { findFirst: vi.fn() },
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
    const result = await service.enableEmployer('user-1', { name: 'Acme', phone: '+251911223344', logoFileId: 'logo-1', businessLicenceFileId: 'licence-1' });

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
    prisma.file.findFirst.mockResolvedValueOnce({ id: 'logo-1', fileCategory: 'logo' }).mockResolvedValue({ id: 'licence-1', fileCategory: 'document' });
    prisma.company.create.mockResolvedValue({
      id: 'co-new',
      name: 'Abebe Hiring',
      verificationStatus: 'pending',
    });

    const service = new AuthService(prisma, jwt, config);
    const result = await service.enableEmployer('user-1', {
      name: 'Abebe Hiring',
      phone: '+251911223344',
      logoFileId: 'logo-1',
      businessLicenceFileId: 'licence-1',
    });

    expect(result.created).toBe(true);
    expect(prisma.company.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Abebe Hiring',
          verificationStatus: 'pending',
          canSelfPublishJobs: false,
          logoFileId: 'logo-1',
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
    prisma.file.findFirst.mockResolvedValueOnce({ id: 'logo-1', fileCategory: 'logo' }).mockResolvedValue({ id: 'licence-1', fileCategory: 'document' });

    const service = new AuthService(prisma, jwt, config);
    await expect(
      service.enableEmployer('user-1', { name: 'Acme', phone: '+251911223344', logoFileId: 'logo-1', businessLicenceFileId: 'licence-1' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('enableEmployer requires a logo before creating a company', async () => {
    const prisma = createPrismaMock();
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      id: 'user-1',
      firstName: 'Abebe',
      lastName: 'Kebede',
      email: 'abebe@example.com',
      companyMemberships: [],
    });
    prisma.file.findFirst.mockResolvedValue(null);

    const service = new AuthService(prisma, jwt, config);
    await expect(
      service.enableEmployer('user-1', { name: 'Acme', phone: '+251911223344', logoFileId: 'missing', businessLicenceFileId: 'licence-1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.company.create).not.toHaveBeenCalled();
  });
});

describe('AuthService Google sign-in', () => {
  const jwt = {
    signAsync: vi.fn().mockResolvedValue('signed-token'),
  } as unknown as JwtService;

  function googleConfig(clientId?: string) {
    return {
      get: vi.fn((key: string) => {
        if (key === 'GOOGLE_CLIENT_ID') return clientId;
        if (key === 'JWT_ACCESS_TTL') return '15m';
        if (key === 'JWT_REFRESH_TTL_DAYS') return 30;
        return undefined;
      }),
      getOrThrow: vi.fn().mockReturnValue('jwt-secret'),
    } as unknown as ConfigService;
  }

  function googleIdentity(overrides: Partial<GoogleIdentity> = {}): GoogleIdentity {
    return {
      sub: 'google-sub-1',
      email: 'new.user@gmail.com',
      emailVerified: true,
      firstName: 'New',
      lastName: 'User',
      ...overrides,
    };
  }

  beforeEach(() => {
    vi.spyOn(googleIdTokenVerifier, 'verify').mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects Google sign-in when the client id is not configured', async () => {
    const service = new AuthService(createPrismaMock(), jwt, googleConfig(''));
    await expect(service.loginWithGoogle('token')).rejects.toBeInstanceOf(BadRequestException);
    expect(googleIdTokenVerifier.verify).not.toHaveBeenCalled();
  });

  it('rejects unverified Google emails', async () => {
    vi.mocked(googleIdTokenVerifier.verify).mockResolvedValue(googleIdentity({ emailVerified: false }));
    const prisma = createPrismaMock();
    const service = new AuthService(prisma, jwt, googleConfig('client-id'));
    await expect(service.loginWithGoogle('token')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('creates a candidate account for a first-time Google user', async () => {
    vi.mocked(googleIdTokenVerifier.verify).mockResolvedValue(googleIdentity());
    const prisma = createPrismaMock();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.role.findUnique.mockResolvedValue({ id: 4, name: 'candidate' });
    prisma.user.create.mockResolvedValue({
      id: 'user-new',
      email: 'new.user@gmail.com',
      roles: [{ role: { name: 'candidate' } }],
    });
    prisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' });
    prisma.refreshToken.update.mockResolvedValue({});

    const service = new AuthService(prisma, jwt, googleConfig('client-id'));
    const result = await service.loginWithGoogle('id-token');

    expect(result.isNew).toBe(true);
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'new.user@gmail.com',
          googleSub: 'google-sub-1',
          firstName: 'New',
          lastName: 'User',
        }),
      }),
    );
  });

  it('signs in an existing Google user without creating another account', async () => {
    vi.mocked(googleIdTokenVerifier.verify).mockResolvedValue(googleIdentity());
    const prisma = createPrismaMock();
    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      email: 'new.user@gmail.com',
      accountStatus: 'active',
      emailVerifiedAt: new Date(),
      roles: [{ role: { name: 'candidate' } }],
    });
    prisma.user.update.mockResolvedValue({});
    prisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' });
    prisma.refreshToken.update.mockResolvedValue({});

    const service = new AuthService(prisma, jwt, googleConfig('client-id'));
    const result = await service.loginWithGoogle('id-token');

    expect(result.isNew).toBe(false);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});
