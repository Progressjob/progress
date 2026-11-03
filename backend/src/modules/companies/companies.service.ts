import { notifyReviewers, notifyCompanyMembers } from '../notifications/notification-events';
import { requireBusinessLicence } from './business-licence';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { CompanyPortalStatus, Prisma } from '@prisma/client';
import { AuthUser } from '../../common/auth';
import { nextUniqueSlug } from '../../common/slug';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CompanyDto,
  CreateEmployerDto,
  ProvisionCompanyDto,
  UpdateCompanyDto,
  UpdateMemberDto,
  VerifyCompanyDto,
} from './companies.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly publicCompanySelect = {
    id: true,
    name: true,
    slug: true,
    logoFileId: true,
    industryId: true,
    description: true,
    vision: true,
    mission: true,
    websiteUrl: true,
    email: true,
    phone: true,
    country: true,
    region: true,
    city: true,
    address: true,
    companySize: true,
    foundedYear: true,
    contactPerson: true,
    verificationStatus: true,
    isFeatured: true,
    logo: true,
    industry: true,
  } satisfies Prisma.CompanySelect;

  listPublic(page = 1, limit = 20, industryId?: string, excludeId?: string) {
    return this.prisma.company.findMany({
      where: {
        verificationStatus: 'verified',
        portalStatus: 'active',
        ...(industryId ? { industryId } : {}),
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      orderBy: [{ isFeatured: 'desc' }, { name: 'asc' }],
      skip: (page - 1) * limit,
      take: Math.min(limit, 100),
      select: {
        ...this.publicCompanySelect,
        _count: { select: { jobs: true } },
      },
    });
  }

  detail(slug: string) {
    return this.prisma.company.findFirstOrThrow({
      where: { slug, verificationStatus: 'verified', portalStatus: 'active' },
      select: {
        ...this.publicCompanySelect,
        jobs: {
          where: { status: 'published', applicationDeadline: { gte: new Date() } },
          orderBy: { postedAt: 'desc' },
        },
      },
    });
  }

  adminList(q?: string) {
    const term = q?.trim();
    const where: Prisma.CompanyWhereInput = term
      ? {
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { slug: { contains: term, mode: 'insensitive' } },
            { email: { contains: term, mode: 'insensitive' } },
            { city: { contains: term, mode: 'insensitive' } },
            { phone: { contains: term, mode: 'insensitive' } },
          ],
        }
      : {};
    return this.prisma.company.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { documents: { where: { documentType: 'business_licence' }, orderBy: { createdAt: 'desc' }, take: 1, include: { file: { select: { originalFilename: true, mimeType: true } } } }, industry: true, logo: true, _count: { select: { jobs: true, members: true } } },
    });
  }

  async uniqueSlug(name: string, excludeId?: string) {
    return nextUniqueSlug(name, async (slug) => {
      const existing = await this.prisma.company.findUnique({
        where: { slug },
        select: { id: true },
      });
      return Boolean(existing && existing.id !== excludeId);
    });
  }

  private async slugIfNameChanged(id: string, name?: string) {
    if (!name?.trim()) return undefined;
    const current = await this.prisma.company.findUnique({
      where: { id },
      select: { name: true },
    });
    if (!current) throw new NotFoundException('Company not found');
    if (current.name === name.trim()) return undefined;
    return this.uniqueSlug(name, id);
  }

  async create(dto: CompanyDto, actorId: string) {
    const { businessLicenceFileId, ...company } = dto;
    const documents = await requireBusinessLicence(this.prisma, businessLicenceFileId, actorId);
    const slug = await this.uniqueSlug(dto.name);
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.company.create({ data: { ...company, slug, documents, verificationStatus: 'pending', canSelfPublishJobs: false } });
      await notifyReviewers(tx, { title: 'Company awaiting verification', message: result.name, type: 'company_review', referenceType: 'company', referenceId: result.id });
      return result;
    });
  }

  async provision(actorId: string, dto: ProvisionCompanyDto) {
    const { businessLicenceFileId, ...companyData } = dto.company;
    const documents = await requireBusinessLicence(this.prisma, businessLicenceFileId, actorId);

    const slug = await this.uniqueSlug(dto.company.name);
    const temporaryPassword = dto.employer.temporaryPassword;

    return this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          ...companyData,
          documents,
          slug,
          verificationStatus: 'pending',
          canSelfPublishJobs: false,
        },
        include: { industry: true },
      });

      await notifyReviewers(tx, { title: 'Company awaiting verification', message: company.name, type: 'company_review', referenceType: 'company', referenceId: company.id });
      const member = await this.addMemberWithTx(tx, company.id, actorId, dto.employer);

      return {
        company,
        member,
        credentials: {
          email: dto.employer.email.toLowerCase().trim(),
          temporaryPassword,
        },
      };
    });
  }

  async update(id: string, dto: UpdateCompanyDto, actorId: string) {
    const { businessLicenceFileId, ...companyData } = dto;
    const documents = businessLicenceFileId ? await requireBusinessLicence(this.prisma, businessLicenceFileId, actorId) : undefined;
    const slug = await this.slugIfNameChanged(id, dto.name);
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.company.update({
      where: { id },
      data: { ...companyData, ...(documents ? { documents, verificationStatus: 'pending', verifiedAt: null, canSelfPublishJobs: false } : {}), ...(slug ? { slug } : {}) },
      });
      if (documents) await notifyReviewers(tx, { title: 'Business licence submitted', message: result.name, type: 'company_review', referenceType: 'company', referenceId: result.id });
      return result;
    });
  }

  async addMember(companyId: string, actorId: string, dto: CreateEmployerDto) {
    return this.prisma.$transaction((tx) => this.addMemberWithTx(tx, companyId, actorId, dto));
  }

  private async addMemberWithTx(
    tx: Prisma.TransactionClient,
    companyId: string,
    actorId: string,
    dto: CreateEmployerDto,
  ) {
    const email = dto.email.toLowerCase().trim();
    const role = await tx.role.findUnique({ where: { name: 'employer' } });
    if (!role) throw new ConflictException('Employer role is not seeded');
    const passwordHash = await argon2.hash(dto.temporaryPassword, { type: argon2.argon2id });

    const nameFromEmail = email.split('@')[0]?.replace(/[._-]+/g, ' ').trim() || 'Company';
    const firstName = nameFromEmail.slice(0, 100) || 'Company';
    const lastName = '';

    let user = await tx.user.findUnique({ where: { email } });
    if (!user) {
      user = await tx.user.create({
        data: {
          email,
          firstName,
          lastName,
          passwordHash,
          roles: { create: { roleId: role.id } },
        },
      });
    } else {
      await tx.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        create: { userId: user.id, roleId: role.id },
        update: {},
      });
    }

    const existing = await tx.companyMember.findUnique({
      where: { companyId_userId: { companyId, userId: user.id } },
    });
    if (existing) {
      throw new ConflictException('This user is already a member of this company');
    }

    return tx.companyMember.create({
      data: {
        companyId,
        userId: user.id,
        memberRole: 'owner',
        invitedBy: actorId,
      },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });
  }

  updateMember(id: string, dto: UpdateMemberDto) {
    return this.prisma.companyMember.update({ where: { id }, data: dto });
  }

  async verify(id: string, dto: VerifyCompanyDto, actorId: string) {
    if (dto.status === 'rejected' && !dto.reviewNote?.trim()) throw new BadRequestException('Explain why the licence was rejected.');
    return this.prisma.$transaction(async (tx) => {
      const document = await tx.companyVerificationDocument.findFirst({
        where: { companyId: id, documentType: 'business_licence' },
        orderBy: { createdAt: 'desc' },
      });
      if (dto.documentId && document?.id !== dto.documentId) throw new ConflictException('The licence changed. Refresh the verification queue before reviewing.');
      if (!document && dto.status === 'verified') {
        throw new BadRequestException('A business licence must be uploaded and reviewed before approval.');
      }
      if (document) await tx.companyVerificationDocument.update({
        where: { id: document.id },
        data: { reviewStatus: dto.status, reviewedBy: actorId, reviewedAt: new Date(), reviewNote: dto.reviewNote?.trim() || null },
      });
      const result = await tx.company.update({
        where: { id },
        data: { verificationStatus: dto.status, verifiedAt: dto.status === 'verified' ? new Date() : null,
          ...(dto.status !== 'verified' ? { canSelfPublishJobs: false } : {}) },
      });
      await notifyCompanyMembers(tx, id, { title: `Company verification: ${dto.status}`, message: dto.reviewNote?.trim() || (dto.status === 'verified' ? 'Your company is approved. You can now submit job postings.' : 'Your company verification status has changed.'), type: 'company_verification', referenceType: 'company', referenceId: id });
      return result;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  feature(id: string, featured: boolean) {
    return this.prisma.company.update({ where: { id }, data: { isFeatured: featured } });
  }

  async setPostingAccess(id: string, canSelfPublishJobs: boolean) {
    if (canSelfPublishJobs) {
      const company = await this.prisma.company.findUnique({ where: { id } });
      if (company?.verificationStatus !== 'verified') throw new BadRequestException('Approve the business licence before enabling direct publishing.');
    }
    return this.prisma.company.update({
      where: { id },
      data: { canSelfPublishJobs },
    });
  }

  async setPortalStatus(id: string, status: CompanyPortalStatus, reason?: string) {
    if (status === 'suspended') {
      return this.suspendCompany(id, reason);
    }
    return this.reactivateCompany(id);
  }

  private async suspendCompany(id: string, reason?: string) {
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundException('Company not found');

    return this.prisma.$transaction(async (tx) => {
      const members = await tx.companyMember.findMany({
        where: { companyId: id, status: 'active' },
        select: { userId: true },
      });
      const userIds = members.map((m) => m.userId);
      if (userIds.length) {
        await tx.user.updateMany({
          where: { id: { in: userIds }, accountStatus: 'active' },
          data: { accountStatus: 'suspended' },
        });
      }
      return tx.company.update({
        where: { id },
        data: {
          portalStatus: 'suspended',
          suspendedAt: new Date(),
          suspendedReason: reason?.trim() || null,
        },
        include: { industry: true, _count: { select: { jobs: true, members: true } } },
      });
    });
  }

  private async reactivateCompany(id: string) {
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundException('Company not found');

    return this.prisma.$transaction(async (tx) => {
      const members = await tx.companyMember.findMany({
        where: { companyId: id },
        select: { userId: true },
      });
      const userIds = members.map((m) => m.userId);
      if (userIds.length) {
        await tx.user.updateMany({
          where: { id: { in: userIds }, accountStatus: 'suspended' },
          data: { accountStatus: 'active' },
        });
      }
      return tx.company.update({
        where: { id },
        data: {
          portalStatus: 'active',
          suspendedAt: null,
          suspendedReason: null,
        },
        include: { industry: true, _count: { select: { jobs: true, members: true } } },
      });
    });
  }

  employerCompanies(user: AuthUser) {
    return this.prisma.company.findMany({
      where: {
        portalStatus: 'active',
        members: { some: { userId: user.id, status: 'active' } },
      },
      include: { industry: true, logo: true },
    });
  }

  async employerCompany(userId: string, companyId: string) {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, members: { some: { userId, status: 'active' } } },
      include: {
        documents: { where: { documentType: 'business_licence' }, orderBy: { createdAt: 'desc' }, take: 1, include: { file: { select: { originalFilename: true, mimeType: true } } } },
        logo: true,
        industry: true,
        members: {
          where: { status: 'active' },
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        },
      },
    });
    if (!company) throw new NotFoundException('Company not found');
    if (company.portalStatus === 'suspended') {
      throw new ForbiddenException(
        'Company access has been suspended. Please contact the platform administrator.',
      );
    }
    return company;
  }

  async employerUpdate(_userId: string, companyId: string, dto: UpdateCompanyDto) {
    const documents = dto.businessLicenceFileId
      ? await requireBusinessLicence(this.prisma, dto.businessLicenceFileId, _userId) : undefined;
    const slug = await this.slugIfNameChanged(companyId, dto.name);
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.company.update({
      where: { id: companyId },
      data: {
        ...(documents ? { documents, verificationStatus: 'pending', verifiedAt: null, canSelfPublishJobs: false } : {}),
        name: dto.name,
        industryId: dto.industryId,
        description: dto.description,
        vision: dto.vision,
        mission: dto.mission,
        websiteUrl: dto.websiteUrl,
        email: dto.email,
        phone: dto.phone,
        country: dto.country,
        region: dto.region,
        city: dto.city,
        address: dto.address,
        companySize: dto.companySize,
        foundedYear: dto.foundedYear,
        logoFileId: dto.logoFileId,
        ...(slug ? { slug } : {}),
      },
      });
      if (documents) await notifyReviewers(tx, { title: 'Business licence submitted', message: result.name, type: 'company_review', referenceType: 'company', referenceId: result.id });
      return result;
    });
  }
}
