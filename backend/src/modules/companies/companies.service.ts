import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthUser } from '../../common/auth';
import { slugify } from '../../common/slug';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CompanyDto,
  CreateEmployerDto,
  UpdateCompanyDto,
  UpdateMemberDto,
  VerifyCompanyDto,
} from './companies.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  listPublic(page = 1, limit = 20) {
    return this.prisma.company.findMany({
      where: { verificationStatus: 'verified' },
      orderBy: [{ isFeatured: 'desc' }, { name: 'asc' }],
      skip: (page - 1) * limit,
      take: Math.min(limit, 100),
      include: { logo: true, industry: true, _count: { select: { jobs: true } } },
    });
  }

  detail(slug: string) {
    return this.prisma.company.findFirstOrThrow({
      where: { slug, verificationStatus: 'verified' },
      include: {
        logo: true,
        industry: true,
        jobs: {
          where: { status: 'published', applicationDeadline: { gte: new Date() } },
          orderBy: { postedAt: 'desc' },
        },
      },
    });
  }

  adminList() {
    return this.prisma.company.findMany({
      orderBy: { createdAt: 'desc' },
      include: { industry: true, _count: { select: { jobs: true, members: true } } },
    });
  }

  async create(dto: CompanyDto) {
    const base = slugify(dto.name);
    let slug = base;
    let count = 1;
    while (await this.prisma.company.findUnique({ where: { slug } })) slug = `${base}-${++count}`;
    return this.prisma.company.create({ data: { ...dto, slug } });
  }

  update(id: string, dto: UpdateCompanyDto) {
    return this.prisma.company.update({ where: { id }, data: dto });
  }

  async addMember(companyId: string, actorId: string, dto: CreateEmployerDto) {
    const email = dto.email.toLowerCase().trim();
    const role = await this.prisma.role.findUnique({ where: { name: 'employer' } });
    if (!role) throw new ConflictException('Employer role is not seeded');
    const passwordHash = await argon2.hash(dto.temporaryPassword, { type: argon2.argon2id });
    return this.prisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({ where: { email } });
      if (!user) {
        user = await tx.user.create({
          data: {
            email,
            firstName: dto.firstName,
            lastName: dto.lastName,
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
      return tx.companyMember.create({
        data: {
          companyId,
          userId: user.id,
          memberRole: dto.memberRole,
          invitedBy: actorId,
        },
        include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
      });
    });
  }

  updateMember(id: string, dto: UpdateMemberDto) {
    return this.prisma.companyMember.update({ where: { id }, data: dto });
  }

  verify(id: string, dto: VerifyCompanyDto) {
    return this.prisma.company.update({
      where: { id },
      data: {
        verificationStatus: dto.status,
        verifiedAt: dto.status === 'verified' ? new Date() : null,
      },
    });
  }

  feature(id: string, featured: boolean) {
    return this.prisma.company.update({ where: { id }, data: { isFeatured: featured } });
  }

  employerCompanies(user: AuthUser) {
    return this.prisma.company.findMany({
      where: { members: { some: { userId: user.id, status: 'active' } } },
      include: { industry: true, logo: true },
    });
  }

  async employerCompany(userId: string, companyId: string) {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, members: { some: { userId, status: 'active' } } },
      include: {
        logo: true,
        industry: true,
        members: {
          where: { status: 'active' },
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        },
      },
    });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  employerUpdate(_userId: string, companyId: string, dto: UpdateCompanyDto) {
    return this.prisma.company.update({
      where: { id: companyId },
      data: {
        description: dto.description,
        websiteUrl: dto.websiteUrl,
        email: dto.email,
        phone: dto.phone,
        region: dto.region,
        city: dto.city,
        address: dto.address,
        companySize: dto.companySize,
        logoFileId: dto.logoFileId,
      },
    });
  }
}
