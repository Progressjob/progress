import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { notifyCompanyMembers, notifyReviewers } from '../notifications/notification-events';
import { TalentService } from '../talent/talent.service';
import { CreateRecommendationDto, RespondRecommendationDto } from './recommendations.dto';

const listInclude = {
  candidate: {
    select: {
      id: true,
      headline: true,
      city: true,
      source: true,
      user: { select: { firstName: true, lastName: true } },
    },
  },
  company: { select: { id: true, name: true } },
  job: { select: { id: true, title: true } },
  recommendedBy: { select: { firstName: true, lastName: true } },
} satisfies Prisma.CandidateRecommendationInclude;

function mapResumes(
  resumes: Array<{
    id: string;
    title: string;
    fileId: string;
    file: { id: string; originalFilename: string; mimeType: string; sizeBytes: bigint };
  }>,
) {
  return resumes.map((resume) => ({
    id: resume.id,
    title: resume.title,
    fileId: resume.fileId,
    originalFilename: resume.file.originalFilename,
    mimeType: resume.file.mimeType,
    sizeBytes: Number(resume.file.sizeBytes),
  }));
}

@Injectable()
export class RecommendationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly talent: TalentService,
  ) {}

  async create(adminId: string, dto: CreateRecommendationDto) {
    const candidate = await this.prisma.candidateProfile.findUnique({
      where: { id: dto.candidateId },
      select: { id: true, user: { select: { firstName: true, lastName: true } } },
    });
    if (!candidate) throw new NotFoundException('Candidate not found');
    const company = await this.prisma.company.findUnique({
      where: { id: dto.companyId },
      select: { id: true, name: true },
    });
    if (!company) throw new NotFoundException('Company not found');
    if (dto.jobId) {
      const job = await this.prisma.job.findFirst({
        where: { id: dto.jobId, companyId: dto.companyId },
        select: { id: true },
      });
      if (!job) throw new BadRequestException('That job does not belong to the selected company');
    }
    const name = `${candidate.user.firstName} ${candidate.user.lastName}`.trim();
    try {
      return await this.prisma.$transaction(async (tx) => {
        const recommendation = await tx.candidateRecommendation.create({
          data: {
            candidateId: dto.candidateId,
            companyId: dto.companyId,
            jobId: dto.jobId ?? null,
            note: dto.note?.trim() || null,
            recommendedById: adminId,
          },
          include: listInclude,
        });
        await notifyCompanyMembers(tx, dto.companyId, {
          type: 'candidate_recommendation',
          referenceType: 'recommendation',
          referenceId: `${dto.companyId}:${recommendation.id}`,
          title: 'Progress candidate recommendation',
          message: dto.note?.trim()
            ? `${name}: ${dto.note.trim()}`
            : `Progress recommended ${name} for your review.`,
        });
        return recommendation;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('This candidate was already recommended to that company for this job');
      }
      throw error;
    }
  }

  list(filters: { companyId?: string; candidateId?: string; status?: string }) {
    return this.prisma.candidateRecommendation.findMany({
      where: {
        ...(filters.companyId ? { companyId: filters.companyId } : {}),
        ...(filters.candidateId ? { candidateId: filters.candidateId } : {}),
        ...(filters.status ? { status: filters.status as never } : {}),
      },
      include: listInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async employerList(companyId: string) {
    return this.list({ companyId });
  }

  async employerDetail(companyId: string, id: string) {
    const recommendation = await this.prisma.candidateRecommendation.findFirst({
      where: { id, companyId },
      include: listInclude,
    });
    if (!recommendation) throw new NotFoundException('Recommendation not found');
    if (recommendation.status === 'sent') {
      await this.prisma.candidateRecommendation.update({
        where: { id },
        data: { status: 'viewed', viewedAt: new Date() },
      });
      recommendation.status = 'viewed';
    }
    const profile = await this.talent.detail(recommendation.candidateId, {
      requireVisible: false,
      revealContact: false,
    });
    let registry: {
      nationalId: string | null;
      gender: string | null;
      dateOfBirth: Date | null;
      expectedSalary: string | null;
      salaryCurrency: string | null;
      consentAt: Date | null;
      registeredAt: Date | null;
      officeRecord: Record<string, string | null>;
      resumes: ReturnType<typeof mapResumes>;
    } | null = null;
    if (recommendation.candidate.source === 'office') {
      const row = await this.prisma.candidateProfile.findUnique({
        where: { id: recommendation.candidateId },
        select: {
          nationalId: true,
          gender: true,
          dateOfBirth: true,
          expectedSalary: true,
          salaryCurrency: true,
          consentAt: true,
          registeredAt: true,
          officeRecord: true,
          resumes: {
            include: {
              file: { select: { id: true, originalFilename: true, mimeType: true, sizeBytes: true } },
            },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
          },
        },
      });
      if (row) {
        const office = row.officeRecord;
        registry = {
          nationalId: row.nationalId,
          gender: row.gender,
          dateOfBirth: row.dateOfBirth,
          expectedSalary: row.expectedSalary?.toString() ?? null,
          salaryCurrency: row.salaryCurrency,
          consentAt: row.consentAt,
          registeredAt: row.registeredAt,
          officeRecord: office
            ? {
                department: office.department,
                category: office.category,
                jobGrade: office.jobGrade,
                basicSalaryExpectation: office.basicSalaryExpectation?.toString() ?? null,
                transportAllowance: office.transportAllowance,
                houseAllowance: office.houseAllowance,
                mobileAllowance: office.mobileAllowance,
                foodCoupon: office.foodCoupon,
                maritalStatus: office.maritalStatus,
                placeOfBirth: office.placeOfBirth,
                bloodGroup: office.bloodGroup,
                motherName: office.motherName,
                emergencyContactName: office.emergencyContactName,
                emergencyRelationship: office.emergencyRelationship,
                emergencyPhone: office.emergencyPhone,
                guarantorName: office.guarantorName,
                guarantorPhone: office.guarantorPhone,
                guarantorNationalId: office.guarantorNationalId,
                bankAccount: office.bankAccount,
                notes: office.notes,
              }
            : {},
          resumes: mapResumes(row.resumes),
        };
      }
    }
    return { ...recommendation, profile, registry };
  }

  async respond(companyId: string, id: string, dto: RespondRecommendationDto) {
    const recommendation = await this.prisma.candidateRecommendation.findFirst({
      where: { id, companyId },
      include: {
        company: { select: { name: true } },
        candidate: { select: { id: true, source: true, user: { select: { firstName: true, lastName: true } } } },
      },
    });
    if (!recommendation) throw new NotFoundException('Recommendation not found');
    const name = `${recommendation.candidate.user.firstName} ${recommendation.candidate.user.lastName}`.trim();
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.candidateRecommendation.update({
        where: { id },
        data: {
          status: dto.status,
          employerResponse: dto.message?.trim() || null,
          respondedAt: new Date(),
          viewedAt: recommendation.viewedAt ?? new Date(),
        },
        include: listInclude,
      });
      const verb = dto.status === 'interested' ? 'is interested in' : 'declined';
      await notifyReviewers(tx, {
        type: 'candidate_recommendation',
        referenceType: 'recommendation',
        referenceId: `${recommendation.candidate.source}:${recommendation.candidate.id}`,
        title: `${recommendation.company.name} ${verb} a candidate`,
        message: dto.message?.trim() ? `${name}: ${dto.message.trim()}` : name,
      });
      return updated;
    });
  }
}
