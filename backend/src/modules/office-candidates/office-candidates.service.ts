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
import type { OfficeSheetRow } from './office-import';
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

function sheetDay(value: Date | null): string {
  if (!value) return '';
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function sheetAge(value: Date | null): string {
  if (!value) return '';
  const today = new Date();
  let years = today.getFullYear() - value.getFullYear();
  const month = today.getMonth() - value.getMonth();
  if (month < 0 || (month === 0 && today.getDate() < value.getDate())) years -= 1;
  return years >= 0 ? String(years) : '';
}

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

  async list(q?: string, officeStatus?: string, page = 1, pageSize = 8) {
    const term = q?.trim();
    const size = Math.min(20, Math.max(1, Number(pageSize) || 8));
    const current = Math.max(1, Number(page) || 1);
    const where: Prisma.CandidateProfileWhereInput = { source: 'office' };
    if (officeStatus) where.officeStatus = officeStatus;
    if (term) {
      where.OR = [
        { headline: { contains: term, mode: 'insensitive' } },
        { city: { contains: term, mode: 'insensitive' } },
        { nationalId: { contains: term, mode: 'insensitive' } },
        { user: { firstName: { contains: term, mode: 'insensitive' } } },
        { user: { lastName: { contains: term, mode: 'insensitive' } } },
        { user: { phone: { contains: term } } },
        { educations: { some: { fieldOfStudy: { contains: term, mode: 'insensitive' } } } },
        { educations: { some: { institution: { contains: term, mode: 'insensitive' } } } },
        { officeRecord: { is: { category: { contains: term, mode: 'insensitive' } } } },
      ];
    }
    const [total, rows] = await Promise.all([
      this.prisma.candidateProfile.count({ where }),
      this.prisma.candidateProfile.findMany({
        where,
        orderBy: [{ user: { lastName: 'asc' } }, { user: { firstName: 'asc' } }],
        skip: (current - 1) * size,
        take: size,
        select: {
          id: true,
          headline: true,
          city: true,
          nationalId: true,
          officeStatus: true,
          registeredAt: true,
          createdAt: true,
          user: { select: { firstName: true, lastName: true, phone: true } },
          educations: { select: { fieldOfStudy: true }, take: 1 },
          officeRecord: { select: { category: true } },
          resumes: { select: { id: true }, take: 1 },
        },
      }),
    ]);
    return {
      items: rows.map((row) => ({
        id: row.id,
        firstName: row.user.firstName,
        lastName: row.user.lastName,
        phone: row.user.phone,
        headline: row.headline,
        city: row.city,
        fieldOfStudy: row.educations[0]?.fieldOfStudy ?? null,
        category: row.officeRecord?.category ?? null,
        nationalId: row.nationalId,
        officeStatus: row.officeStatus,
        registeredAt: row.registeredAt,
        createdAt: row.createdAt,
        hasCv: row.resumes.length > 0,
      })),
      total,
      page: current,
      pageSize: size,
    };
  }

  async exportRows(): Promise<OfficeSheetRow[]> {
    const rows = await this.prisma.candidateProfile.findMany({
      where: { source: 'office' },
      orderBy: [{ user: { lastName: 'asc' } }, { user: { firstName: 'asc' } }],
      select: {
        headline: true,
        summary: true,
        gender: true,
        dateOfBirth: true,
        city: true,
        nationalId: true,
        officeStatus: true,
        registeredAt: true,
        expectedSalary: true,
        user: { select: { firstName: true, lastName: true, phone: true } },
        educations: { select: { qualification: true, fieldOfStudy: true, institution: true }, take: 1 },
        languages: { select: { name: true }, orderBy: { name: 'asc' } },
        officeRecord: true,
      },
    });
    return rows.map((row, index) => {
      const record = row.officeRecord;
      const education = row.educations[0];
      const salary = record?.basicSalaryExpectation ?? row.expectedSalary;
      const lastName = row.user.lastName === '-' ? '' : row.user.lastName;
      return {
        no: index + 1,
        nationalId: row.nationalId ?? '',
        name: `${row.user.firstName} ${lastName}`.trim(),
        registeredAt: sheetDay(row.registeredAt),
        headline: row.headline ?? '',
        department: record?.department ?? '',
        category: record?.category ?? '',
        jobGrade: record?.jobGrade ?? '',
        salary: salary == null ? '' : String(salary),
        bankAccount: record?.bankAccount ?? '',
        transportAllowance: record?.transportAllowance ?? '',
        houseAllowance: record?.houseAllowance ?? '',
        mobileAllowance: record?.mobileAllowance ?? '',
        foodCoupon: record?.foodCoupon ?? '',
        languages: row.languages.map((language) => language.name).join(', '),
        phone: row.user.phone ?? '',
        maritalStatus: record?.maritalStatus ?? '',
        gender: row.gender ?? '',
        dateOfBirth: sheetDay(row.dateOfBirth),
        age: sheetAge(row.dateOfBirth),
        summary: row.summary ?? '',
        qualification: education?.qualification ?? '',
        fieldOfStudy: education?.fieldOfStudy ?? '',
        institution: education?.institution && education.institution !== 'Not specified' ? education.institution : '',
        motherName: record?.motherName ?? '',
        emergencyContactName: record?.emergencyContactName ?? '',
        emergencyRelationship: record?.emergencyRelationship ?? '',
        emergencyPhone: record?.emergencyPhone ?? '',
        city: row.city ?? '',
        placeOfBirth: record?.placeOfBirth ?? '',
        bloodGroup: record?.bloodGroup ?? '',
        guarantorName: record?.guarantorName ?? '',
        guarantorPhone: record?.guarantorPhone ?? '',
        guarantorNationalId: record?.guarantorNationalId ?? '',
        officeStatus: row.officeStatus ?? '',
        notes: record?.notes ?? '',
      };
    });
  }

  async remove(profileId: string) {
    const profile = await this.prisma.candidateProfile.findFirst({
      where: { id: profileId, source: 'office' },
      select: { userId: true },
    });
    if (!profile) throw new NotFoundException('Office candidate not found');
    try {
      await this.prisma.user.delete({ where: { id: profile.userId } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException('This candidate is still linked to other records and cannot be deleted.');
      }
      throw error;
    }
  }

  async create(adminId: string, dto: OfficeCandidateFieldsDto) {
    const phone = this.requirePhone(dto.phone);
    const nationalId = blank(dto.nationalId);
    this.assertNationalId(nationalId);
    this.normalizeEmergencyPhone(dto);
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
    if (nationalId !== undefined) this.assertNationalId(nationalId);
    if (dto.emergencyPhone !== undefined) this.normalizeEmergencyPhone(dto);
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

  private normalizeEmergencyPhone(dto: { emergencyPhone?: string }) {
    const raw = blank(dto.emergencyPhone);
    if (!raw) return;
    const phone = toEthiopianE164(raw);
    if (!phone) {
      throw new BadRequestException('Emergency phone must start with +251 and contain 9 digits');
    }
    dto.emergencyPhone = phone;
  }

  private assertNationalId(nationalId?: string | null) {
    if (nationalId && !/^\d{16}$/.test(nationalId)) {
      throw new BadRequestException('National ID FAN number must be exactly 16 digits');
    }
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
    const noSchooling = qualification?.toLowerCase() === 'no formal schooling';
    const fieldOfStudy = noSchooling ? null : blank(dto.fieldOfStudy);
    const institution = noSchooling ? null : blank(dto.institution);
    if (!qualification && !fieldOfStudy && !institution) return undefined;
    return {
      create: {
        institution: noSchooling ? '' : (institution ?? 'Not specified'),
        qualification,
        fieldOfStudy,
      },
    };
  }
}
