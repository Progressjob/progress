import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccountStatus, JobStatus, Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { FilesService } from '../files/files.service';
import { rankMatchingJobs } from '../jobs/jobs.recommendations';
import { OfficeCandidateFieldsDto, UpdateOfficeCandidateDto } from './office-candidates.dto';
import { toEthiopianE164 } from './ethiopian-phone';

const OFFICE_KEYS = [
  'department',
  'category',
  'jobGrade',
  'transportAllowance',
  'houseAllowance',
  'mobileAllowance',
  'foodCoupon',
  'maritalStatus',
  'placeOfBirth',
  'bloodGroup',
  'motherName',
  'emergencyContactName',
  'emergencyRelationship',
  'emergencyPhone',
  'guarantorName',
  'guarantorPhone',
  'guarantorNationalId',
  'bankAccount',
  'notes',
] as const;

const detailInclude = {
  user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true, mustChangePassword: true } },
  educations: { orderBy: { endDate: 'desc' as const } },
  languages: { orderBy: { name: 'asc' as const } },
  officeRecord: true,
  resumes: {
    include: { file: { select: { id: true, originalFilename: true, mimeType: true, sizeBytes: true } } },
    orderBy: [{ isDefault: 'desc' as const }, { createdAt: 'desc' as const }],
  },
  recommendations: {
    orderBy: { createdAt: 'desc' as const },
    include: {
      company: { select: { id: true, name: true } },
      job: { select: { id: true, title: true } },
    },
  },
} satisfies Prisma.CandidateProfileInclude;

function blank(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function languagesOf(raw?: string | null): string[] {
  return (raw ?? '')
    .split(/[,;/|]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function officeData(dto: Partial<OfficeCandidateFieldsDto>, salary?: number | null) {
  const data: Record<string, string | Prisma.Decimal | null> = {};
  for (const key of OFFICE_KEYS) {
    if (key in dto) data[key] = blank(dto[key] as string | undefined);
  }
  if (salary !== undefined) data.basicSalaryExpectation = salary === null ? null : new Prisma.Decimal(salary);
  return data;
}

@Injectable()
export class OfficeCandidatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FilesService,
  ) {}

  async list(q?: string, officeStatus?: string) {
    const term = q?.trim();
    const where: Prisma.CandidateProfileWhereInput = { source: 'office' };
    if (officeStatus) where.officeStatus = officeStatus;
    if (term) {
      where.OR = [
        { headline: { contains: term, mode: 'insensitive' } },
        { nationalId: { contains: term, mode: 'insensitive' } },
        { user: { firstName: { contains: term, mode: 'insensitive' } } },
        { user: { lastName: { contains: term, mode: 'insensitive' } } },
        { user: { phone: { contains: term } } },
      ];
    }
    const rows = await this.prisma.candidateProfile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        headline: true,
        city: true,
        nationalId: true,
        officeStatus: true,
        registeredAt: true,
        createdAt: true,
        user: { select: { firstName: true, lastName: true, phone: true } },
        resumes: { select: { id: true }, take: 1 },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      firstName: row.user.firstName,
      lastName: row.user.lastName,
      phone: row.user.phone,
      headline: row.headline,
      city: row.city,
      nationalId: row.nationalId,
      officeStatus: row.officeStatus,
      registeredAt: row.registeredAt,
      createdAt: row.createdAt,
      hasCv: row.resumes.length > 0,
    }));
  }

  async create(adminId: string, dto: OfficeCandidateFieldsDto) {
    const phone = this.requirePhone(dto.phone);
    const nationalId = blank(dto.nationalId);
    await this.assertUnique(phone, nationalId);
    const role = await this.prisma.role.findUnique({ where: { name: 'candidate' } });
    if (!role) throw new ConflictException('Roles have not been seeded');
    const salary = dto.expectedSalary ?? null;
    const registeredAt = dto.registeredAt ? new Date(dto.registeredAt) : new Date();
    const profile = await this.prisma.candidateProfile.create({
      data: {
        source: 'office',
        headline: blank(dto.headline),
        summary: blank(dto.summary),
        gender: blank(dto.gender),
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        city: blank(dto.city),
        country: 'Ethiopia',
        expectedSalary: salary === null ? null : new Prisma.Decimal(salary),
        salaryCurrency: salary === null ? null : 'ETB',
        nationalId,
        registeredBy: { connect: { id: adminId } },
        registeredAt,
        consentAt: dto.consent ? registeredAt : null,
        officeStatus: dto.officeStatus ?? 'new',
        profileVisibility: 'employers',
        user: {
          create: {
            firstName: dto.firstName.trim(),
            lastName: dto.lastName.trim(),
            phone,
            accountStatus: AccountStatus.active,
            roles: { create: { roleId: role.id } },
          },
        },
        educations: this.educationCreate(dto),
        languages: { create: languagesOf(dto.languages).map((name) => ({ name })) },
        officeRecord: { create: officeData(dto, salary) },
      },
      select: { id: true },
    });
    return this.detail(profile.id);
  }

  async detail(profileId: string) {
    const profile = await this.prisma.candidateProfile.findFirst({
      where: { id: profileId, source: 'office' },
      include: detailInclude,
    });
    if (!profile) throw new NotFoundException('Office candidate not found');
    return {
      ...profile,
      resumes: profile.resumes.map((resume) => ({
        ...resume,
        file: { ...resume.file, sizeBytes: Number(resume.file.sizeBytes) },
      })),
    };
  }

  async update(profileId: string, dto: UpdateOfficeCandidateDto) {
    const existing = await this.prisma.candidateProfile.findFirst({
      where: { id: profileId, source: 'office' },
      select: { id: true, userId: true, consentAt: true, nationalId: true },
    });
    if (!existing) throw new NotFoundException('Office candidate not found');
    const phone = dto.phone === undefined ? undefined : this.requirePhone(dto.phone);
    const nationalId = dto.nationalId === undefined ? undefined : blank(dto.nationalId);
    await this.assertUnique(phone, nationalId, existing.userId, existing.id);
    const salary = dto.expectedSalary;
    await this.prisma.$transaction(async (tx) => {
      if (dto.firstName || dto.lastName || phone) {
        await tx.user.update({
          where: { id: existing.userId },
          data: {
            ...(dto.firstName ? { firstName: dto.firstName.trim() } : {}),
            ...(dto.lastName ? { lastName: dto.lastName.trim() } : {}),
            ...(phone ? { phone } : {}),
          },
        });
      }
      await tx.candidateProfile.update({
        where: { id: existing.id },
        data: {
          ...(dto.headline !== undefined ? { headline: blank(dto.headline) } : {}),
          ...(dto.summary !== undefined ? { summary: blank(dto.summary) } : {}),
          ...(dto.gender !== undefined ? { gender: blank(dto.gender) } : {}),
          ...(dto.dateOfBirth !== undefined ? { dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null } : {}),
          ...(dto.city !== undefined ? { city: blank(dto.city) } : {}),
          ...(salary !== undefined ? { expectedSalary: new Prisma.Decimal(salary), salaryCurrency: 'ETB' } : {}),
          ...(nationalId !== undefined ? { nationalId } : {}),
          ...(dto.officeStatus ? { officeStatus: dto.officeStatus } : {}),
          ...(dto.registeredAt ? { registeredAt: new Date(dto.registeredAt) } : {}),
          ...(dto.consent && !existing.consentAt ? { consentAt: new Date() } : {}),
        },
      });
      const record = officeData(dto, salary);
      if (Object.keys(record).length) {
        await tx.candidateOfficeRecord.upsert({
          where: { candidateId: existing.id },
          create: { candidateId: existing.id, ...record },
          update: record,
        });
      }
      if (dto.qualification !== undefined || dto.fieldOfStudy !== undefined || dto.institution !== undefined) {
        await tx.candidateEducation.deleteMany({ where: { candidateId: existing.id } });
        const education = this.educationCreate(dto);
        if (education) await tx.candidateEducation.create({ data: { candidateId: existing.id, ...education.create } });
      }
      if (dto.languages !== undefined) {
        await tx.candidateLanguage.deleteMany({ where: { candidateId: existing.id } });
        const names = languagesOf(dto.languages);
        if (names.length) {
          await tx.candidateLanguage.createMany({
            data: names.map((name) => ({ candidateId: existing.id, name })),
          });
        }
      }
    });
    return this.detail(profileId);
  }

  async setStatus(profileId: string, officeStatus: string) {
    const updated = await this.prisma.candidateProfile.updateMany({
      where: { id: profileId, source: 'office' },
      data: { officeStatus },
    });
    if (!updated.count) throw new NotFoundException('Office candidate not found');
    return { id: profileId, officeStatus };
  }

  async attachCv(profileId: string, file: Express.Multer.File) {
    const profile = await this.prisma.candidateProfile.findFirst({
      where: { id: profileId, source: 'office' },
      select: { id: true, userId: true },
    });
    if (!profile) throw new NotFoundException('Office candidate not found');
    const stored = await this.files.upload(profile.userId, file, 'cv');
    await this.prisma.$transaction([
      this.prisma.candidateResume.updateMany({
        where: { candidateId: profile.id, isDefault: true },
        data: { isDefault: false },
      }),
      this.prisma.candidateResume.create({
        data: {
          candidateId: profile.id,
          fileId: stored.id,
          title: 'Office CV',
          isDefault: true,
        },
      }),
    ]);
    return this.detail(profile.id);
  }

  async matchingJobs(profileId: string) {
    const profile = await this.prisma.candidateProfile.findFirst({
      where: { id: profileId, source: 'office' },
      include: { educations: true, experiences: true, skills: true },
    });
    if (!profile) throw new NotFoundException('Office candidate not found');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const jobs = await this.prisma.job.findMany({
      where: { status: JobStatus.published, postedAt: { not: null }, applicationDeadline: { gte: today } },
      select: {
        id: true,
        title: true,
        slug: true,
        educationRequirement: true,
        applicationDeadline: true,
        category: { select: { name: true } },
        skills: { select: { skillId: true } },
        company: { select: { id: true, name: true } },
        location: { select: { city: true, name: true } },
      },
      orderBy: [{ isFeatured: 'desc' }, { postedAt: 'desc' }],
    });
    const ranked = rankMatchingJobs(profile, jobs, 12);
    const byId = new Map(jobs.map((job) => [job.id, job]));
    return ranked.flatMap(({ id, score }) => {
      const job = byId.get(id);
      return job ? [{ ...job, score }] : [];
    });
  }

  async takenContacts() {
    const [users, profiles] = await Promise.all([
      this.prisma.user.findMany({ where: { phone: { not: null } }, select: { phone: true } }),
      this.prisma.candidateProfile.findMany({
        where: { nationalId: { not: null } },
        select: { nationalId: true },
      }),
    ]);
    return {
      phones: new Set(users.map((user) => user.phone!).filter(Boolean)),
      fans: new Set(profiles.map((profile) => profile.nationalId!).filter(Boolean)),
    };
  }

  async issueAccess(profileId: string) {
    const profile = await this.prisma.candidateProfile.findFirst({
      where: { id: profileId, source: 'office' },
      select: { user: { select: { id: true, phone: true } } },
    });
    if (!profile) throw new NotFoundException('Office candidate not found');
    const temporaryPassword = `Pg${randomBytes(6).toString('base64url')}`;
    await this.prisma.user.update({
      where: { id: profile.user.id },
      data: {
        passwordHash: await argon2.hash(temporaryPassword, { type: argon2.argon2id }),
        mustChangePassword: true,
      },
    });
    return { phone: profile.user.phone, temporaryPassword };
  }

  private requirePhone(raw: string): string {
    const phone = toEthiopianE164(raw);
    if (!phone) throw new BadRequestException('Enter a valid Ethiopian mobile number');
    return phone;
  }

  private async assertUnique(phone?: string, nationalId?: string | null, userId?: string, profileId?: string) {
    if (phone) {
      const taken = await this.prisma.user.findFirst({
        where: { phone, ...(userId ? { NOT: { id: userId } } : {}) },
        select: { id: true },
      });
      if (taken) throw new ConflictException('Phone number is already registered');
    }
    if (nationalId) {
      const taken = await this.prisma.candidateProfile.findFirst({
        where: { nationalId, ...(profileId ? { NOT: { id: profileId } } : {}) },
        select: { id: true },
      });
      if (taken) throw new ConflictException('FAN number is already registered');
    }
  }

  private educationCreate(dto: Partial<OfficeCandidateFieldsDto>) {
    const qualification = blank(dto.qualification);
    const fieldOfStudy = blank(dto.fieldOfStudy);
    const institution = blank(dto.institution);
    if (!qualification && !fieldOfStudy && !institution) return undefined;
    return {
      create: {
        institution: institution ?? 'Not specified',
        qualification,
        fieldOfStudy,
      },
    };
  }
}
