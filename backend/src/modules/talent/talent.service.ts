import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const MIN_QUERY_LENGTH = 2;

const visibleWhere: Prisma.CandidateProfileWhereInput = {
  profileVisibility: { in: ['public', 'employers'] },
  user: { accountStatus: 'active' },
};

const cardSelect = {
  id: true,
  photoFileId: true,
  headline: true,
  summary: true,
  gender: true,
  country: true,
  region: true,
  city: true,
  yearsExperience: true,
  availabilityStatus: true,
  user: { select: { firstName: true, lastName: true } },
  experiences: {
    orderBy: [{ isCurrent: 'desc' as const }, { startDate: 'desc' as const }],
    take: 1,
    select: { jobTitle: true },
  },
} satisfies Prisma.CandidateProfileSelect;

const detailInclude = {
  user: { select: { firstName: true, lastName: true, email: true, phone: true } },
  educations: { orderBy: { startDate: 'desc' as const } },
  experiences: { orderBy: [{ isCurrent: 'desc' as const }, { startDate: 'desc' as const }] },
  skills: { include: { skill: true } },
  certifications: { orderBy: { issuedDate: 'desc' as const } },
  languages: { orderBy: { name: 'asc' as const } },
  resumes: {
    include: {
      file: { select: { id: true, originalFilename: true, mimeType: true, sizeBytes: true } },
    },
    orderBy: [{ isDefault: 'desc' as const }, { createdAt: 'desc' as const }],
    take: 1,
  },
} satisfies Prisma.CandidateProfileInclude;

type CardRow = Prisma.CandidateProfileGetPayload<{ select: typeof cardSelect }>;
type DetailRow = Prisma.CandidateProfileGetPayload<{ include: typeof detailInclude }>;

function searchWhere(term: string): Prisma.CandidateProfileWhereInput {
  return {
    AND: [
      visibleWhere,
      {
        OR: [
          { headline: { contains: term, mode: 'insensitive' } },
          { summary: { contains: term, mode: 'insensitive' } },
          { experiences: { some: { jobTitle: { contains: term, mode: 'insensitive' } } } },
          { skills: { some: { skill: { name: { contains: term, mode: 'insensitive' } } } } },
          { educations: { some: { fieldOfStudy: { contains: term, mode: 'insensitive' } } } },
          { educations: { some: { qualification: { contains: term, mode: 'insensitive' } } } },
        ],
      },
    ],
  };
}

function toCard(profile: CardRow | DetailRow) {
  const currentTitle =
    'experiences' in profile && profile.experiences[0]
      ? profile.experiences[0].jobTitle
      : profile.headline;
  return {
    id: profile.id,
    firstName: profile.user.firstName,
    lastName: profile.user.lastName,
    photoFileId: profile.photoFileId,
    headline: profile.headline,
    currentTitle: currentTitle ?? profile.headline ?? null,
    city: profile.city,
    region: profile.region,
    country: profile.country,
    gender: profile.gender,
    yearsExperience: profile.yearsExperience,
    summary: profile.summary,
    availabilityStatus: profile.availabilityStatus,
  };
}

@Injectable()
export class TalentService {
  constructor(private readonly prisma: PrismaService) {}

  async spotlight() {
    const [searchableCount, rows] = await this.prisma.$transaction([
      this.prisma.candidateProfile.count({ where: visibleWhere }),
      this.prisma.candidateProfile.findMany({
        where: visibleWhere,
        select: cardSelect,
        orderBy: { updatedAt: 'desc' },
        take: 6,
      }),
    ]);
    return { searchableCount, items: rows.map(toCard) };
  }

  async search(q?: string, page = 1, limit = 12) {
    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const term = q?.trim() ?? '';
    if (term.length < MIN_QUERY_LENGTH) {
      return { items: [], total: 0, page: safePage, limit: safeLimit };
    }

    const where = searchWhere(term);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.candidateProfile.findMany({
        where,
        select: cardSelect,
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.candidateProfile.count({ where }),
    ]);

    return { items: rows.map(toCard), total, page: safePage, limit: safeLimit };
  }

  async detail(candidateId: string) {
    const profile = await this.prisma.candidateProfile.findFirst({
      where: { id: candidateId, ...visibleWhere },
      include: detailInclude,
    });
    if (!profile) throw new NotFoundException('Candidate not found');

    const resume = profile.resumes[0];
    return {
      ...toCard(profile),
      email: profile.user.email,
      phone: profile.user.phone,
      websiteUrl: profile.websiteUrl,
      careerLevel: profile.careerLevel,
      managerialExperience: profile.managerialExperience,
      educations: profile.educations,
      experiences: profile.experiences.map(({ salary: _salary, ...rest }) => rest),
      skills: profile.skills,
      certifications: profile.certifications,
      languages: profile.languages,
      resume: resume
        ? {
            id: resume.id,
            title: resume.title,
            fileId: resume.fileId,
            originalFilename: resume.file.originalFilename,
            mimeType: resume.file.mimeType,
            sizeBytes: Number(resume.file.sizeBytes),
          }
        : null,
    };
  }
}
