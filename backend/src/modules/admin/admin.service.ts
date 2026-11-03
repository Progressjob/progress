import { notifyReviewers } from '../notifications/notification-events';
import { Injectable, NotFoundException } from '@nestjs/common';
import { AccountStatus, ApplicationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const PIPELINE_STATUSES: ApplicationStatus[] = [
  'submitted',
  'reviewing',
  'shortlisted',
  'interview',
  'offered',
];

export interface AdminListCandidatesQuery {
  q?: string;
  accountStatus?: string;
  outcome?: string;
  applicationStatus?: string;
}
import {
  ContactMessageDto,
  JobReportDto,
  UpdateContactDto,
  UpdateReportDto,
  UpdateUserStatusDto,
} from './admin.dto';

const REPORT_PERSON_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
} as const;

const REPORT_SELECT = {
  id: true,
  reason: true,
  description: true,
  status: true,
  createdAt: true,
  job: {
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      employmentType: true,
      applicationDeadline: true,
      company: {
        select: {
          id: true,
          name: true,
          slug: true,
          contactPerson: true,
          email: true,
          phone: true,
        },
      },
      creator: { select: REPORT_PERSON_SELECT },
    },
  },
  reporter: { select: REPORT_PERSON_SELECT },
  reviewer: { select: REPORT_PERSON_SELECT },
} as const;

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  contact(dto: ContactMessageDto) {
    return this.prisma.$transaction(async (tx) => {
      const message = await tx.contactMessage.create({ data: dto });
      await notifyReviewers(tx, { title: 'New support message', message: dto.subject, type: 'support_message', referenceType: 'contact', referenceId: message.id });
      return message;
    });
  }

  report(dto: JobReportDto, reportedBy?: string) {
    return this.prisma.$transaction(async (tx) => {
      const report = await tx.jobReport.create({ data: { ...dto, reportedBy } });
      await notifyReviewers(tx, { title: 'Job reported', message: dto.reason, type: 'job_report', referenceType: 'report', referenceId: report.id });
      return report;
    });
  }

  async dashboard() {
    const [companies, jobs, candidates, applications, pendingReports, pendingReviewJobs, publishedJobs] =
      await this.prisma.$transaction([
        this.prisma.company.count(),
        this.prisma.job.count(),
        this.prisma.candidateProfile.count(),
        this.prisma.application.count(),
        this.prisma.jobReport.count({ where: { status: 'pending' } }),
        this.prisma.job.count({ where: { status: 'pending_review' } }),
        this.prisma.job.count({ where: { status: 'published' } }),
      ]);
    return {
      companies,
      jobs,
      candidates,
      registeredCandidates: candidates,
      applications,
      pendingReports,
      pendingReviewJobs,
      publishedJobs,
    };
  }

  async candidates(query: AdminListCandidatesQuery = {}) {
    const term = query.q?.trim();
    const where: Prisma.UserWhereInput = {
      roles: { some: { role: { name: 'candidate' } } },
    };
    const and: Prisma.UserWhereInput[] = [];

    if (term) {
      and.push({
        OR: [
          { firstName: { contains: term, mode: 'insensitive' } },
          { lastName: { contains: term, mode: 'insensitive' } },
          { email: { contains: term, mode: 'insensitive' } },
          { phone: { contains: term, mode: 'insensitive' } },
          {
            candidateProfile: {
              is: { headline: { contains: term, mode: 'insensitive' } },
            },
          },
          {
            candidateProfile: {
              is: {
                applications: {
                  some: { job: { title: { contains: term, mode: 'insensitive' } } },
                },
              },
            },
          },
          {
            candidateProfile: {
              is: {
                applications: {
                  some: {
                    job: { company: { name: { contains: term, mode: 'insensitive' } } },
                  },
                },
              },
            },
          },
        ],
      });
    }

    if (query.accountStatus && ['active', 'pending', 'suspended'].includes(query.accountStatus)) {
      and.push({ accountStatus: query.accountStatus as AccountStatus });
    }

    const appStatus = query.applicationStatus as ApplicationStatus | undefined;
    if (appStatus) {
      and.push({
        candidateProfile: { is: { applications: { some: { status: appStatus } } } },
      });
    }

    switch (query.outcome) {
      case 'no_applications':
        and.push({
          OR: [
            { candidateProfile: null },
            { candidateProfile: { is: { applications: { none: {} } } } },
          ],
        });
        break;
      case 'placed':
        and.push({
          candidateProfile: { is: { applications: { some: { status: 'hired' } } } },
        });
        break;
      case 'offered':
        and.push({
          candidateProfile: {
            is: { applications: { some: { status: 'offered' } } },
          },
        });
        break;
      case 'in_pipeline':
        and.push({
          candidateProfile: {
            is: { applications: { some: { status: { in: PIPELINE_STATUSES } } } },
          },
        });
        break;
      default:
        break;
    }

    if (and.length) where.AND = and;

    const users = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        accountStatus: true,
        createdAt: true,
        lastLoginAt: true,
        candidateProfile: {
          select: {
            id: true,
            headline: true,
            city: true,
            region: true,
            country: true,
            availabilityStatus: true,
            applicationsBlocked: true,
            _count: { select: { applications: true, resumes: true } },
            applications: {
              orderBy: { appliedAt: 'desc' },
              select: {
                id: true,
                status: true,
                appliedAt: true,
                updatedAt: true,
                job: {
                  select: {
                    id: true,
                    title: true,
                    slug: true,
                    company: { select: { id: true, name: true, slug: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    return users.map((user) => this.toAdminCandidateRow(user));
  }

  private toAdminCandidateRow(user: {
    id: string;
    email: string | null;
    phone: string | null;
    firstName: string;
    lastName: string;
    accountStatus: AccountStatus;
    createdAt: Date;
    lastLoginAt: Date | null;
    candidateProfile: {
      id: string;
      headline: string | null;
      city: string | null;
      region: string | null;
      country: string | null;
      availabilityStatus: string | null;
      applicationsBlocked: boolean;
      _count: { applications: number; resumes: number };
      applications: Array<{
        id: string;
        status: ApplicationStatus;
        appliedAt: Date;
        updatedAt: Date;
        job: {
          id: string;
          title: string;
          slug: string;
          company: { id: string; name: string; slug: string };
        };
      }>;
    } | null;
  }) {
    const apps = user.candidateProfile?.applications ?? [];
    const hired = apps.find((a) => a.status === 'hired');
    const hasOffered = apps.some((a) => a.status === 'offered');
    const inPipeline = apps.some((a) => PIPELINE_STATUSES.includes(a.status));

    let outcome: 'working' | 'offered' | 'in_pipeline' | 'closed_out' | 'none';
    if (hired) outcome = 'working';
    else if (hasOffered) outcome = 'offered';
    else if (inPipeline) outcome = 'in_pipeline';
    else if (apps.length > 0) outcome = 'closed_out';
    else outcome = 'none';

    const activeApplicationsCount = apps.filter(
      (a) => !['rejected', 'withdrawn', 'hired'].includes(a.status),
    ).length;

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      accountStatus: user.accountStatus,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      profile: user.candidateProfile
        ? {
            id: user.candidateProfile.id,
            headline: user.candidateProfile.headline,
            city: user.candidateProfile.city,
            region: user.candidateProfile.region,
            country: user.candidateProfile.country,
            availabilityStatus: user.candidateProfile.availabilityStatus,
            applicationsBlocked: user.candidateProfile.applicationsBlocked,
          }
        : null,
      stats: {
        applicationsCount: apps.length,
        activeApplicationsCount,
        resumeCount: user.candidateProfile?._count.resumes ?? 0,
      },
      outcome,
      placement: hired
        ? {
            applicationId: hired.id,
            status: hired.status,
            appliedAt: hired.appliedAt,
            updatedAt: hired.updatedAt,
            jobTitle: hired.job.title,
            jobSlug: hired.job.slug,
            jobId: hired.job.id,
            companyId: hired.job.company.id,
            companyName: hired.job.company.name,
            companySlug: hired.job.company.slug,
          }
        : null,
      applications: apps.map((a) => ({
        id: a.id,
        status: a.status,
        appliedAt: a.appliedAt,
        updatedAt: a.updatedAt,
        job: a.job,
      })),
    };
  }

  users() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        accountStatus: true,
        createdAt: true,
        roles: { select: { role: true } },
      },
    });
  }

  updateUser(id: string, dto: UpdateUserStatusDto) {
    return this.prisma.user.update({ where: { id }, data: { accountStatus: dto.status } });
  }

  async setCandidateApplicationAccess(userId: string, blocked: boolean) {
    const profile = await this.prisma.candidateProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Candidate profile not found');
    }
    return this.prisma.candidateProfile.update({
      where: { userId },
      data: { applicationsBlocked: blocked },
      select: { id: true, userId: true, applicationsBlocked: true },
    });
  }

  reports() {
    return this.prisma.jobReport.findMany({
      orderBy: { createdAt: 'desc' },
      select: REPORT_SELECT,
    });
  }

  async getReport(id: string) {
    const report = await this.prisma.jobReport.findUnique({
      where: { id },
      select: REPORT_SELECT,
    });
    if (!report) throw new NotFoundException('Report not found');
    return report;
  }

  updateReport(id: string, reviewerId: string, dto: UpdateReportDto) {
    return this.prisma.jobReport.update({
      where: { id },
      data: { status: dto.status, reviewedBy: reviewerId, reviewedAt: new Date() },
    });
  }

  contacts() {
    return this.prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' } });
  }

  updateContact(id: string, dto: UpdateContactDto) {
    return this.prisma.contactMessage.update({ where: { id }, data: dto });
  }

  auditLogs() {
    return this.prisma.adminAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: {
        actor: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }
}
