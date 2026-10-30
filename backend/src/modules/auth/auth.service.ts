import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { nextUniqueSlug } from '../../common/slug';
import {
  EnableEmployerDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
} from './auth.dto';
import { verifyGoogleIdToken } from './google-token';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException('Email is already registered');
    }
    const phone = dto.phone.trim();
    if (!phone) {
      throw new BadRequestException('Phone number is strictly required');
    }
    if (await this.prisma.user.findUnique({ where: { phone } })) {
      throw new ConflictException('Phone number is already registered');
    }
    const candidateRole = await this.prisma.role.findUnique({ where: { name: 'candidate' } });
    if (!candidateRole) throw new ConflictException('Roles have not been seeded');

    const user = await this.prisma.user.create({
      data: {
        email,
        phone,
        passwordHash: await argon2.hash(dto.password, { type: argon2.argon2id }),
        firstName: dto.firstName,
        lastName: dto.lastName,
        roles: { create: { roleId: candidateRole.id } },
        candidateProfile: { create: {} },
      },
      include: { roles: { include: { role: true } } },
    });
    return this.issueTokens(user.id, user.email, user.roles.map((r) => r.role.name));
  }

  async login(dto: LoginDto) {
    const identifier = dto.identifier.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ email: identifier }, { phone: dto.identifier.trim() }] },
      include: { roles: { include: { role: true } } },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.passwordHash) {
      throw new UnauthorizedException('This account uses Google sign-in. Continue with Google instead.');
    }
    if (!(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    this.assertActiveAccount(user.accountStatus);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    return this.issueTokens(user.id, user.email, user.roles.map((r) => r.role.name));
  }

  async loginWithGoogle(idToken: string) {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID')?.trim();
    if (!clientId) {
      throw new BadRequestException('Google sign-in is not configured');
    }

    let identity: Awaited<ReturnType<typeof verifyGoogleIdToken>>;
    try {
      identity = await verifyGoogleIdToken(idToken, clientId);
    } catch {
      throw new UnauthorizedException('Google sign-in failed');
    }
    if (!identity.emailVerified) {
      throw new UnauthorizedException('Google did not verify this email address');
    }

    const existingBySub = await this.prisma.user.findUnique({
      where: { googleSub: identity.sub },
      include: { roles: { include: { role: true } } },
    });
    if (existingBySub) {
      this.assertActiveAccount(existingBySub.accountStatus);
      await this.prisma.user.update({
        where: { id: existingBySub.id },
        data: { lastLoginAt: new Date(), emailVerifiedAt: existingBySub.emailVerifiedAt ?? new Date() },
      });
      const tokens = await this.issueTokens(
        existingBySub.id,
        existingBySub.email,
        existingBySub.roles.map((r) => r.role.name),
      );
      return { ...tokens, isNew: false };
    }

    const existingByEmail = await this.prisma.user.findUnique({
      where: { email: identity.email },
      include: { roles: { include: { role: true } } },
    });
    if (existingByEmail) {
      this.assertActiveAccount(existingByEmail.accountStatus);
      if (existingByEmail.googleSub && existingByEmail.googleSub !== identity.sub) {
        throw new ConflictException('This email is already linked to a different Google account');
      }
      await this.prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          googleSub: identity.sub,
          emailVerifiedAt: existingByEmail.emailVerifiedAt ?? new Date(),
          lastLoginAt: new Date(),
        },
      });
      const tokens = await this.issueTokens(
        existingByEmail.id,
        existingByEmail.email,
        existingByEmail.roles.map((r) => r.role.name),
      );
      return { ...tokens, isNew: false };
    }

    const candidateRole = await this.prisma.role.findUnique({ where: { name: 'candidate' } });
    if (!candidateRole) throw new ConflictException('Roles have not been seeded');

    const user = await this.prisma.user.create({
      data: {
        email: identity.email,
        googleSub: identity.sub,
        firstName: identity.firstName,
        lastName: identity.lastName,
        emailVerifiedAt: new Date(),
        lastLoginAt: new Date(),
        roles: { create: { roleId: candidateRole.id } },
        candidateProfile: { create: {} },
      },
      include: { roles: { include: { role: true } } },
    });
    const tokens = await this.issueTokens(
      user.id,
      user.email,
      user.roles.map((r) => r.role.name),
    );
    return { ...tokens, isNew: true };
  }

  async refresh(rawToken: string) {
    let payload: { sub: string; tokenId: string };
    try {
      payload = await this.jwt.verifyAsync(rawToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const stored = await this.prisma.refreshToken.findUnique({ where: { id: payload.tokenId } });
    if (
      !stored ||
      stored.userId !== payload.sub ||
      stored.revokedAt ||
      stored.expiresAt <= new Date() ||
      !(await argon2.verify(stored.tokenHash, rawToken))
    ) {
      throw new UnauthorizedException('Refresh token has expired or was revoked');
    }
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: stored.userId },
      include: { roles: { include: { role: true } } },
    });
    return this.issueTokens(user.id, user.email, user.roles.map((r) => r.role.name));
  }

  async logout(rawToken: string): Promise<void> {
    try {
      const payload = await this.jwt.verifyAsync<{ tokenId: string }>(rawToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
      await this.prisma.refreshToken.updateMany({
        where: { id: payload.tokenId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch {
      // Logout is idempotent and does not reveal token validity.
    }
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ resetToken?: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });
    if (!user) return {};
    const token = randomBytes(32).toString('hex');
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashOpaqueToken(token),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });
    // Returned only so a development mail adapter can deliver it. Production callers
    // should send it by email and strip this field at the controller boundary.
    return this.config.get('NODE_ENV') === 'production' ? {} : { resetToken: token };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const reset = await this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash: this.hashOpaqueToken(dto.token),
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!reset) throw new UnauthorizedException('Invalid or expired reset token');
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: reset.userId },
        data: { passwordHash: await argon2.hash(dto.password, { type: argon2.argon2id }) },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: reset.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: reset.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async enableCandidate(userId: string) {
    const candidateRole = await this.prisma.role.findUnique({ where: { name: 'candidate' } });
    if (!candidateRole) throw new ConflictException('Roles have not been seeded');

    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.upsert({
        where: { userId_roleId: { userId, roleId: candidateRole.id } },
        create: { userId, roleId: candidateRole.id },
        update: {},
      });
      const profile = await tx.candidateProfile.findUnique({ where: { userId } });
      if (!profile) {
        await tx.candidateProfile.create({ data: { userId } });
      }
    });

    return this.me(userId);
  }

  async enableEmployer(userId: string, dto: EnableEmployerDto) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        companyMemberships: {
          where: { status: 'active' },
          include: { company: { include: { industry: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    const existing = user.companyMemberships[0];
    if (existing) {
      await this.ensureRole(userId, 'employer');
      return { company: existing.company, created: false };
    }

    const employerRole = await this.prisma.role.findUnique({ where: { name: 'employer' } });
    if (!employerRole) throw new ConflictException('Roles have not been seeded');

    const slug = await nextUniqueSlug(dto.name, async (value) =>
      Boolean(await this.prisma.company.findUnique({ where: { slug: value } })),
    );
    const contactPerson =
      dto.contactPerson?.trim() || `${user.firstName} ${user.lastName}`.trim() || undefined;
    const email = dto.email?.trim().toLowerCase() || user.email || undefined;

    return this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: dto.name.trim(),
          slug,
          city: dto.city?.trim() || undefined,
          phone: dto.phone?.trim() || undefined,
          email,
          contactPerson,
          description: dto.description?.trim() || undefined,
          verificationStatus: 'pending',
          canSelfPublishJobs: false,
        },
        include: { industry: true },
      });

      await tx.userRole.upsert({
        where: { userId_roleId: { userId, roleId: employerRole.id } },
        create: { userId, roleId: employerRole.id },
        update: {},
      });

      await tx.companyMember.create({
        data: {
          companyId: company.id,
          userId,
          memberRole: 'owner',
        },
      });

      return { company, created: true };
    });
  }

  private async ensureRole(userId: string, roleName: string): Promise<void> {
    const role = await this.prisma.role.findUnique({ where: { name: roleName } });
    if (!role) throw new ConflictException('Roles have not been seeded');
    await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId: role.id } },
      create: { userId, roleId: role.id },
      update: {},
    });
  }

  async me(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        accountStatus: true,
        roles: { select: { role: { select: { name: true } } } },
        candidateProfile: { select: { id: true, applicationsBlocked: true } },
        companyMemberships: {
          where: { status: 'active' },
          select: { companyId: true, memberRole: true },
        },
      },
    });
  }

  private assertActiveAccount(accountStatus: string): void {
    if (accountStatus === 'suspended') {
      throw new UnauthorizedException(
        'Your account access has been suspended. Please contact the platform administrator.',
      );
    }
    if (accountStatus !== 'active') {
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  private async issueTokens(userId: string, email: string | null, roles: string[]) {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, email, roles },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_TTL', '15m') as never,
      },
    );
    const days = this.config.get<number>('JWT_REFRESH_TTL_DAYS', 30);
    const expiresAt = new Date(Date.now() + days * 86_400_000);
    const tokenRecord = await this.prisma.refreshToken.create({
      data: { userId, tokenHash: 'pending', expiresAt },
    });
    const refreshToken = await this.jwt.signAsync(
      { sub: userId, tokenId: tokenRecord.id },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: `${days}d`,
      },
    );
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { tokenHash: await argon2.hash(refreshToken, { type: argon2.argon2id }) },
    });
    return { accessToken, refreshToken, expiresAt };
  }

  private hashOpaqueToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
