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
import {
  ApplyDto,
  ChangeApplicationStatusDto,
  CreateInterviewDto,
  UpdateInterviewDto,
} from './applications.dto';

const APPLICATION_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
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

@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async apply(userId: string, jobId: string, dto: ApplyDto) {
    const candidate = await this.prisma.candidateProfile.findUnique({ where: { userId } });
    if (!candidate) throw new ForbiddenException('Candidate profile required');
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        screeningQuestions: true,
        company: { include: { members: { where: { status: 'active' } } } },
      },
    });
    if (!job || job.status !== 'published') throw new UnprocessableEntityException('Job is not open');
    if (job.applicationMethod !== 'internal') {
      throw new UnprocessableEntityException('This job accepts applications externally');
    }
    if (job.applicationDeadline < this.today()) {
      throw new UnprocessableEntityException('Application deadline has passed');
    }
    if (dto.resumeId) {
      const resume = await this.prisma.candidateResume.findFirst({
        where: { id: dto.resumeId, candidateId: candidate.id },
      });
      if (!resume) throw new BadRequestException('Resume does not belong to this candidate');
    }
    const questionIds = new Set(job.screeningQuestions.map((q) => q.id));
    if (dto.answers.some((answer) => !questionIds.has(answer.questionId))) {
      throw new BadRequestException('An answer references a question from another job');
    }
    const answered = new Set(dto.answers.filter((a) => a.answerText.trim()).map((a) => a.questionId));
    const missing = job.screeningQuestions.filter((q) => q.isRequired && !answered.has(q.id));
    if (missing.length) throw new BadRequestException('Required screening answers are missing');

    try {
      return await this.prisma.$transaction(async (tx) => {
        const application = await tx.application.create({
          data: {
            jobId,
            candidateId: candidate.id,
            resumeId: dto.resumeId,
            coverLetter: dto.coverLetter,
            answers: { create: dto.answers },
            events: {
              create: { changedBy: userId, oldStatus: null, newStatus: 'submitted' },
            },
          },
          include: { answers: true, events: true },
        });
        const recipients = job.company.members.map((member) => member.userId);
        if (recipients.length) {
          await tx.notification.createMany({
            data: recipients.map((memberUserId) => ({
              userId: memberUserId,
              title: 'New job application',
              message: `A candidate applied for ${job.title}`,
              type: 'new_application',
              referenceType: 'application',
              referenceId: application.id,
            })),
          });
        }
        return application;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('You have already applied for this job');
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
        job: { include: { company: true } },
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
    });
    if (!application) throw new NotFoundException();
    return this.changeStatusRecord(application.id, application.status, 'withdrawn', userId);
  }

  employerList(
    userId: string,
    companyId: string,
    jobId: string,
    status?: ApplicationStatus,
    search?: string,
  ) {
    return this.prisma.application.findMany({
      where: {
        jobId,
        status,
        job: {
          companyId,
          company: { members: { some: { userId, status: 'active' } } },
        },
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

  async employerDetail(userId: string, companyId: string, id: string) {
    const application = await this.prisma.application.findFirst({
      where: {
        id,
        job: {
          companyId,
          company: { members: { some: { userId, status: 'active' } } },
        },
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
  ) {
    const application = await this.prisma.application.findFirst({
      where: {
        id,
        job: {
          companyId,
          company: { members: { some: { userId, status: 'active' } } },
        },
      },
    });
    if (!application) throw new NotFoundException();
    if (dto.status === 'withdrawn') throw new ForbiddenException('Only candidates can withdraw');
    return this.changeStatusRecord(id, application.status, dto.status, userId, dto.note);
  }

  async createInterview(userId: string, companyId: string, applicationId: string, dto: CreateInterviewDto) {
    await this.employerDetail(userId, companyId, applicationId);
    return this.prisma.$transaction(async (tx) => {
      const interview = await tx.interview.create({
        data: {
          applicationId,
          scheduledBy: userId,
          interviewType: dto.interviewType,
          scheduledAt: new Date(dto.scheduledAt),
          locationOrLink: dto.locationOrLink,
        },
      });
      const application = await tx.application.findUniqueOrThrow({
        where: { id: applicationId },
        include: { candidate: true },
      });
      if (APPLICATION_TRANSITIONS[application.status].includes('interview')) {
        await tx.application.update({ where: { id: applicationId }, data: { status: 'interview' } });
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
      await tx.notification.create({
        data: {
          userId: application.candidate.userId,
          title: 'Interview scheduled',
          message: `An interview is scheduled for ${dto.scheduledAt}`,
          type: 'application_update',
          referenceType: 'application',
          referenceId: applicationId,
        },
      });
      return interview;
    });
  }

  async updateInterview(userId: string, companyId: string, id: string, dto: UpdateInterviewDto) {
    const interview = await this.prisma.interview.findFirst({
      where: {
        id,
        application: {
          job: {
            companyId,
            company: { members: { some: { userId, status: 'active' } } },
          },
        },
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
  ) {
    assertApplicationTransition(oldStatus, newStatus);
    return this.prisma.$transaction(async (tx) => {
      const application = await tx.application.update({
        where: { id },
        data: {
          status: newStatus,
          withdrawnAt: newStatus === 'withdrawn' ? new Date() : undefined,
        },
        include: { candidate: true },
      });
      await tx.applicationEvent.create({
        data: { applicationId: id, changedBy, oldStatus, newStatus, note },
      });
      await tx.notification.create({
        data: {
          userId: application.candidate.userId,
          title: 'Application status updated',
          message: `Your application is now ${newStatus}`,
          type: 'application_update',
          referenceType: 'application',
          referenceId: id,
        },
      });
      return application;
    });
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
