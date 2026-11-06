import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ApplicationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { notifyCompanyMembers } from '../notifications/notification-events';
import {
  ApplyDto,
  ChangeApplicationStatusDto,
  CreateInterviewDto,
  SendApplicationMessageDto,
  UpdateInterviewDto,
} from './applications.dto';

export function isOwnCompanyJob(
  userId: string,
  members: Array<{ userId: string }>,
): boolean {
  return members.some((member) => member.userId === userId);
}

export const APPLICATION_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  submitted: ['reviewing', 'shortlisted', 'rejected', 'withdrawn'],
  reviewing: ['shortlisted', 'interview', 'rejected', 'withdrawn'],
  shortlisted: ['interview', 'offered', 'rejected', 'withdrawn'],
  interview: ['offered', 'rejected', 'withdrawn'],
  offered: ['hired', 'rejected', 'withdrawn'],
  hired: [],
  rejected: [],
  withdrawn: [],
};

export function assertApplicationTransition(
  current: ApplicationStatus,
  next: ApplicationStatus,
): void {
  if (!APPLICATION_TRANSITIONS[current].includes(next)) {
    throw new BadRequestException(`Cannot move an application from ${current} to ${next}`);
  }
}

function isStaff(roles?: string[]): boolean {
  return Boolean(roles?.some((role) => role === 'admin' || role === 'moderator'));
}

@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async apply(userId: string, jobId: string, dto: ApplyDto) {
    const candidate = await this.candidate(userId);
    if (candidate.applicationsBlocked) {
      throw new ForbiddenException('Your account cannot submit applications right now');
    }

    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        company: { include: { members: { where: { status: 'active' }, select: { userId: true } } } },
        screeningQuestions: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!job || job.status !== 'published') {
      throw new UnprocessableEntityException('Job is not open');
    }
    if (job.applicationDeadline < this.today()) {
      throw new UnprocessableEntityException('The application deadline has passed');
    }
    if (isOwnCompanyJob(userId, job.company.members)) {
      throw new ForbiddenException('You cannot apply to a job at your own company');
    }

    if (dto.resumeId) {
      const resume = await this.prisma.candidateResume.findFirst({
        where: { id: dto.resumeId, candidateId: candidate.id },
      });
      if (!resume) throw new BadRequestException('Resume not found on your profile');
    }

    const answers = dto.answers ?? [];
    const required = job.screeningQuestions.filter((q) => q.isRequired);
    for (const question of required) {
      const answer = answers.find((a) => a.questionId === question.id);
      if (!answer?.answerText?.trim()) {
        throw new BadRequestException(`Answer required for: ${question.questionText}`);
      }
    }
    const allowedIds = new Set(job.screeningQuestions.map((q) => q.id));
    for (const answer of answers) {
      if (!allowedIds.has(answer.questionId)) {
        throw new BadRequestException('Invalid screening question');
      }
    }

    const existing = await this.prisma.application.findUnique({
      where: { jobId_candidateId: { jobId, candidateId: candidate.id } },
    });
    if (existing && existing.status !== 'rejected') {
      throw new ConflictException('You have already applied to this job');
    }

    const include = {
      job: { include: { company: true } },
      resume: { include: { file: true } },
      answers: { include: { question: true } },
    } as const;

    const answerCreates = answers.map((a) => ({
      questionId: a.questionId,
      answerText: a.answerText.trim(),
    }));

    try {
      return await this.prisma.$transaction(async (tx) => {
        const candidateName = await tx.user.findUnique({
          where: { id: userId },
          select: { firstName: true, lastName: true },
        });
        const who =
          [candidateName?.firstName, candidateName?.lastName].filter(Boolean).join(' ') ||
          'A candidate';

        if (existing?.status === 'rejected') {
          await tx.applicationAnswer.deleteMany({ where: { applicationId: existing.id } });
          const application = await tx.application.update({
            where: { id: existing.id },
            data: {
              resumeId: dto.resumeId ?? null,
              coverLetter: dto.coverLetter?.trim() || null,
              status: 'submitted',
              appliedAt: new Date(),
              resubmittedAt: new Date(),
              withdrawnAt: null,
              answers: answerCreates.length ? { create: answerCreates } : undefined,
            },
            include,
          });

          await tx.applicationEvent.create({
            data: {
              applicationId: application.id,
              changedBy: userId,
              oldStatus: 'rejected',
              newStatus: 'submitted',
              note: 'Application resubmitted',
            },
          });

          await notifyCompanyMembers(tx, job.companyId, {
            title: 'Application resubmitted',
            message: `${who} resubmitted their application for ${job.title} after rejection. Open Review candidates to respond.`,
            type: 'application_update',
            referenceType: 'candidates',
            referenceId: job.companyId,
          });

          return application;
        }

        const application = await tx.application.create({
          data: {
            jobId,
            candidateId: candidate.id,
            resumeId: dto.resumeId,
            coverLetter: dto.coverLetter?.trim() || null,
            status: 'submitted',
            answers: answerCreates.length ? { create: answerCreates } : undefined,
          },
          include,
        });

        await tx.applicationEvent.create({
          data: {
            applicationId: application.id,
            changedBy: userId,
            oldStatus: null,
            newStatus: 'submitted',
            note: 'Application submitted',
          },
        });

        await notifyCompanyMembers(tx, job.companyId, {
          title: 'New application',
          message: `${who} applied for ${job.title}. Open Review candidates to respond.`,
          type: 'application_update',
          referenceType: 'candidates',
          referenceId: job.companyId,
        });

        return application;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('You have already applied to this job');
      }
      throw error;
    }
  }

  async candidateList(userId: string) {
    const candidate = await this.candidate(userId);
    return this.prisma.application.findMany({
      where: { candidateId: candidate.id },
      orderBy: { appliedAt: 'desc' },
      include: { job: { include: { company: true, location: true } } },
    });
  }

  async candidateDetail(userId: string, id: string) {
    const candidate = await this.candidate(userId);
    const application = await this.prisma.application.findFirst({
      where: { id, candidateId: candidate.id },
      include: {
        job: { include: { company: true, location: true, category: true } },
        resume: { include: { file: true } },
        answers: { include: { question: true } },
        events: { orderBy: { createdAt: 'asc' } },
        interviews: { orderBy: { scheduledAt: 'asc' } },
      },
    });
    if (!application) throw new NotFoundException();
    return application;
  }

  async withdraw(userId: string, id: string) {
    const candidate = await this.candidate(userId);
    const application = await this.prisma.application.findFirst({
      where: { id, candidateId: candidate.id },
      include: { job: true },
    });
    if (!application) throw new NotFoundException();
    return this.changeStatusRecord(
      application.id,
      application.status,
      'withdrawn',
      userId,
      undefined,
      { notifyCompanyOnWithdraw: true, jobTitle: application.job.title, companyId: application.job.companyId, jobId: application.jobId },
    );
  }

  async employerList(
    userId: string,
    companyId: string,
    jobId: string,
    status?: ApplicationStatus,
    search?: string,
    roles?: string[],
  ) {
    await this.assertCompanyAccess(userId, companyId, roles);
    return this.prisma.application.findMany({
      where: {
        jobId,
        status,
        job: { companyId },
        candidate: {
          user: search
            ? {
                OR: [
                  { firstName: { contains: search, mode: 'insensitive' } },
                  { lastName: { contains: search, mode: 'insensitive' } },
                  { email: { contains: search, mode: 'insensitive' } },
                ],
              }
            : undefined,
        },
      },
      orderBy: { appliedAt: 'desc' },
      include: {
        candidate: { include: { user: true, skills: { include: { skill: true } } } },
        resume: { include: { file: true } },
      },
    });
  }

  async employerDetail(userId: string, companyId: string, id: string, roles?: string[]) {
    await this.assertCompanyAccess(userId, companyId, roles);
    const application = await this.prisma.application.findFirst({
      where: {
        id,
        job: { companyId },
      },
      include: {
        job: true,
        candidate: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true, phone: true } },
            educations: true,
            experiences: true,
            skills: { include: { skill: true } },
          },
        },
        resume: { include: { file: true } },
        answers: { include: { question: true } },
        events: { orderBy: { createdAt: 'asc' } },
        interviews: true,
      },
    });
    if (!application) throw new NotFoundException();
    return application;
  }

  async changeStatus(
    userId: string,
    companyId: string,
    id: string,
    dto: ChangeApplicationStatusDto,
    roles?: string[],
  ) {
    const application = await this.employerDetail(userId, companyId, id, roles);
    if (dto.status === 'withdrawn') throw new ForbiddenException('Only candidates can withdraw');
    if (dto.status === 'interview') {
      throw new BadRequestException(
        'Schedule an interview with a date and time to move this application to interview',
      );
    }
    return this.changeStatusRecord(
      id,
      application.status,
      dto.status,
      userId,
      dto.note,
      { jobTitle: application.job.title },
    );
  }

  async sendMessage(
    userId: string,
    companyId: string,
    id: string,
    dto: SendApplicationMessageDto,
    roles?: string[],
  ) {
    const application = await this.employerDetail(userId, companyId, id, roles);
    const body = dto.body.trim();
    if (!body) throw new BadRequestException('Message cannot be empty');

    return this.prisma.$transaction(async (tx) => {
      const event = await tx.applicationEvent.create({
        data: {
          applicationId: id,
          changedBy: userId,
          oldStatus: application.status,
          newStatus: application.status,
          note: body,
        },
      });
      await tx.notification.create({
        data: {
          userId: application.candidate.userId,
          title: 'Message about your application',
          message: `Regarding ${application.job.title}: ${body.slice(0, 180)}`,
          type: 'application_update',
          referenceType: 'application',
          referenceId: id,
        },
      });
      return event;
    });
  }

  async createInterview(
    userId: string,
    companyId: string,
    applicationId: string,
    dto: CreateInterviewDto,
    roles?: string[],
  ) {
    const application = await this.employerDetail(userId, companyId, applicationId, roles);
    const scheduledAt = new Date(dto.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      throw new BadRequestException('A valid interview date and time is required');
    }
    if (scheduledAt.getTime() < Date.now() - 60_000) {
      throw new BadRequestException('Interview time must be in the future');
    }
    const canEnterInterview =
      APPLICATION_TRANSITIONS[application.status].includes('interview');
    const alreadyInInterview = application.status === 'interview';
    if (!canEnterInterview && !alreadyInInterview) {
      throw new BadRequestException(
        `Cannot schedule an interview while the application is ${application.status}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const interview = await tx.interview.create({
        data: {
          applicationId,
          scheduledBy: userId,
          interviewType: dto.interviewType,
          scheduledAt,
          locationOrLink: dto.locationOrLink?.trim() || null,
        },
      });
      if (canEnterInterview) {
        await tx.application.update({
          where: { id: applicationId },
          data: { status: 'interview' },
        });
        await tx.applicationEvent.create({
          data: {
            applicationId,
            changedBy: userId,
            oldStatus: application.status,
            newStatus: 'interview',
            note: 'Interview scheduled',
          },
        });
      }
      const when = scheduledAt.toLocaleString();
      const typeLabel = dto.interviewType.replace(/_/g, ' ');
      const place = dto.locationOrLink?.trim();
      const placeSuffix = place ? ` Location/link: ${place.slice(0, 120)}` : '';
      await tx.notification.create({
        data: {
          userId: application.candidate.userId,
          title: 'Interview scheduled',
          message: `Your interview for ${application.job.title} (${typeLabel}) is scheduled for ${when}.${placeSuffix}`,
          type: 'application_update',
          referenceType: 'application',
          referenceId: applicationId,
        },
      });
      return interview;
    });
  }

  async updateInterview(
    userId: string,
    companyId: string,
    id: string,
    dto: UpdateInterviewDto,
    roles?: string[],
  ) {
    await this.assertCompanyAccess(userId, companyId, roles);
    const interview = await this.prisma.interview.findFirst({
      where: {
        id,
        application: { job: { companyId } },
      },
    });
    if (!interview) throw new NotFoundException();
    return this.prisma.interview.update({
      where: { id },
      data: {
        ...dto,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      },
    });
  }

  private async changeStatusRecord(
    id: string,
    oldStatus: ApplicationStatus,
    newStatus: ApplicationStatus,
    changedBy: string,
    note?: string,
    opts?: {
      notifyCompanyOnWithdraw?: boolean;
      jobTitle?: string;
      companyId?: string;
      jobId?: string;
    },
  ) {
    assertApplicationTransition(oldStatus, newStatus);
    const trimmedNote = note?.trim() || undefined;
    if (newStatus === 'rejected' && !trimmedNote) {
      throw new BadRequestException('A rejection reason is required');
    }

    return this.prisma.$transaction(async (tx) => {
      const application = await tx.application.update({
        where: { id },
        data: {
          status: newStatus,
          withdrawnAt: newStatus === 'withdrawn' ? new Date() : undefined,
        },
        include: {
          candidate: true,
          job: true,
        },
      });
      await tx.applicationEvent.create({
        data: {
          applicationId: id,
          changedBy,
          oldStatus,
          newStatus,
          note: trimmedNote,
        },
      });

      const jobTitle = opts?.jobTitle ?? application.job.title;

      if (newStatus === 'withdrawn' && changedBy === application.candidate.userId) {
        // Candidate withdrew — notify company, skip self-notify noise
      } else if (newStatus === 'rejected') {
        await tx.notification.create({
          data: {
            userId: application.candidate.userId,
            title: 'Application rejected',
            message: `Your application for ${jobTitle} was rejected. Rejection reason: ${trimmedNote!.slice(0, 160)}`,
            type: 'application_update',
            referenceType: 'application',
            referenceId: id,
          },
        });
      } else {
        const noteSuffix = trimmedNote ? ` Note: ${trimmedNote.slice(0, 160)}` : '';
        await tx.notification.create({
          data: {
            userId: application.candidate.userId,
            title: 'Application status updated',
            message: `Your application for ${jobTitle} is now ${newStatus}.${noteSuffix}`,
            type: 'application_update',
            referenceType: 'application',
            referenceId: id,
          },
        });
      }

      if (opts?.notifyCompanyOnWithdraw && opts.companyId && opts.jobId) {
        await notifyCompanyMembers(tx, opts.companyId, {
          title: 'Application withdrawn',
          message: `A candidate withdrew their application for ${jobTitle}`,
          type: 'application_update',
          referenceType: 'job',
          referenceId: opts.jobId,
        });
      }

      return application;
    });
  }

  private async assertCompanyAccess(userId: string, companyId: string, roles?: string[]) {
    if (isStaff(roles)) return;
    const membership = await this.prisma.companyMember.findFirst({
      where: { companyId, userId, status: 'active' },
    });
    if (!membership) throw new ForbiddenException('Not an active company member');
  }

  private async candidate(userId: string) {
    const candidate = await this.prisma.candidateProfile.findUnique({ where: { userId } });
    if (!candidate) throw new ForbiddenException();
    return candidate;
  }

  private today(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
}
