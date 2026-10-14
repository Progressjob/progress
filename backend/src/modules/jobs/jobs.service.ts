import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EmploymentType, JobStatus, Prisma, WorkplaceType } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { slugify } from '../../common/slug';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateJobDto,
  ReplaceJobSkillsDto,
  ReplaceScreeningDto,
  UpdateJobDto,
} from './jobs.dto';

@Injectable()
export class JobPostingPolicy {
  constructor(private readonly config: ConfigService) {}

  assertCanPost(_companyId: string): void {
    // Subscription enforcement is intentionally deferred. This seam becomes the
    // paid-plan allowance check without changing job creation callers.
    void this.config.get<boolean>('EMPLOYER_SELF_POSTING', false);
  }
}

const JOB_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  draft: ['pending_review', 'published', 'archived'],
  pending_review: ['published', 'rejected'],
  published: ['closed'],
  rejected: ['draft', 'archived'],
  closed: ['archived', 'published'],
  archived: [],
};

export function assertJobTransition(current: JobStatus, next: JobStatus): void {
  if (!JOB_TRANSITIONS[current].includes(next)) {
    throw new BadRequestException(`Cannot move a job from ${current} to ${next}`);
  }
}

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: JobPostingPolicy,
  ) {}

  async listPublic(filters: {
    q?: string;
    category?: string;
    location?: string;
    company?: string;
    employmentType?: EmploymentType;
    careerLevel?: string;
    workplaceType?: WorkplaceType;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(filters.page ?? 1, 1);
    const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100);
    let matchingIds: string[] | undefined;
    if (filters.q?.trim()) {
      const rows = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT id FROM jobs
        WHERE search_vector @@ websearch_to_tsquery('english', ${filters.q.trim()})
        ORDER BY ts_rank(search_vector, websearch_to_tsquery('english', ${filters.q.trim()})) DESC
        LIMIT 1000
      `);
      matchingIds = rows.map((row) => row.id);
      if (!matchingIds.length) return { data: [], page, limit, total: 0 };
    }
    const where: Prisma.JobWhereInput = {
      id: matchingIds ? { in: matchingIds } : undefined,
      status: 'published',
      postedAt: { not: null },
      applicationDeadline: { gte: this.today() },
      category: filters.category ? { slug: filters.category } : undefined,
      location: filters.location ? { slug: filters.location } : undefined,
      company: filters.company ? { slug: filters.company } : undefined,
      employmentType: filters.employmentType,
      careerLevel: filters.careerLevel,
      workplaceType: filters.workplaceType,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.job.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ isFeatured: 'desc' }, { postedAt: 'desc' }],
        include: { company: { include: { logo: true } }, category: true, location: true },
      }),
      this.prisma.job.count({ where }),
    ]);
    return { data, page, limit, total };
  }

  async publicDetail(slug: string, sessionId?: string, source?: string) {
    const job = await this.prisma.job.findFirst({
      where: { slug, status: 'published', applicationDeadline: { gte: this.today() } },
      include: {
        company: { include: { logo: true, industry: true } },
        category: true,
        location: true,
        skills: { include: { skill: true } },
        screeningQuestions: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!job) throw new NotFoundException('Job not found');
    if (sessionId) {
      const since = new Date(Date.now() - 86_400_000);
      const exists = await this.prisma.jobView.findFirst({
        where: { jobId: job.id, sessionId, viewedAt: { gte: since } },
      });
      if (!exists) {
        await this.prisma.jobView.create({ data: { jobId: job.id, sessionId, source } });
      }
    }
    return job;
  }

  adminList(status?: JobStatus) {
    return this.prisma.job.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
      include: { company: true, category: true, location: true },
    });
  }

  async create(actorId: string, dto: CreateJobDto) {
    this.validateRanges(dto);
    this.policy.assertCanPost(dto.companyId);
    const base = slugify(`${dto.title}-${Date.now()}`);
    return this.prisma.job.create({
      data: {
        ...dto,
        applicationDeadline: new Date(dto.applicationDeadline),
        createdBy: actorId,
        slug: base,
      },
    });
  }

  async update(id: string, dto: UpdateJobDto) {
    this.validateRanges(dto);
    const job = await this.prisma.job.findUnique({ where: { id } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.status === 'archived') throw new BadRequestException('Archived jobs cannot be edited');
    return this.prisma.job.update({
      where: { id },
      data: {
        ...dto,
        applicationDeadline: dto.applicationDeadline
          ? new Date(dto.applicationDeadline)
          : undefined,
      },
    });
  }

  async transition(id: string, next: JobStatus, actorId: string) {
    const job = await this.prisma.job.findUnique({ where: { id } });
    if (!job) throw new NotFoundException('Job not found');
    assertJobTransition(job.status, next);
    if (next === 'published' && job.applicationDeadline < this.today()) {
      throw new BadRequestException('The application deadline has passed');
    }
    return this.prisma.job.update({
      where: { id },
      data: {
        status: next,
        postedAt: next === 'published' ? new Date() : job.postedAt,
        approvedBy: next === 'published' ? actorId : job.approvedBy,
        approvedAt: next === 'published' ? new Date() : job.approvedAt,
      },
    });
  }

  replaceScreening(id: string, dto: ReplaceScreeningDto) {
    return this.prisma.$transaction(async (tx) => {
      await tx.jobScreeningQuestion.deleteMany({ where: { jobId: id } });
      if (dto.questions.length) {
        await tx.jobScreeningQuestion.createMany({
          data: dto.questions.map((question) => ({ ...question, jobId: id, options: question.options as Prisma.InputJsonValue })),
        });
      }
      return tx.jobScreeningQuestion.findMany({
        where: { jobId: id },
        orderBy: { sortOrder: 'asc' },
      });
    });
  }

  replaceSkills(id: string, dto: ReplaceJobSkillsDto) {
    return this.prisma.$transaction(async (tx) => {
      await tx.jobSkill.deleteMany({ where: { jobId: id } });
      if (dto.skills.length) {
        await tx.jobSkill.createMany({
          data: dto.skills.map((skill) => ({ jobId: id, ...skill })),
        });
      }
      return tx.jobSkill.findMany({ where: { jobId: id }, include: { skill: true } });
    });
  }

  employerJobs(userId: string, companyId: string) {
    return this.prisma.job.findMany({
      where: {
        companyId,
        company: { members: { some: { userId, status: 'active' } } },
      },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { applications: true, views: true } } },
    });
  }

  async employerStats(userId: string, companyId: string, jobId: string) {
    const job = await this.prisma.job.findFirst({
      where: {
        id: jobId,
        companyId,
        company: { members: { some: { userId, status: 'active' } } },
      },
      select: { id: true },
    });
    if (!job) throw new ForbiddenException();
    const [views, applications] = await this.prisma.$transaction([
      this.prisma.jobView.count({ where: { jobId } }),
      this.prisma.application.groupBy({
        by: ['status'],
        where: { jobId },
        orderBy: { status: 'asc' },
        _count: true,
      }),
    ]);
    return { views, applications };
  }

  @Cron('0 5 * * *')
  closeExpiredJobs() {
    return this.prisma.job.updateMany({
      where: { status: 'published', applicationDeadline: { lt: this.today() } },
      data: { status: 'closed' },
    });
  }

  private validateRanges(dto: UpdateJobDto): void {
    if (
      dto.salaryMin !== undefined &&
      dto.salaryMax !== undefined &&
      dto.salaryMin > dto.salaryMax
    ) {
      throw new BadRequestException('salaryMin must not exceed salaryMax');
    }
    if (
      dto.experienceMinYears !== undefined &&
      dto.experienceMaxYears !== undefined &&
      dto.experienceMinYears > dto.experienceMaxYears
    ) {
      throw new BadRequestException('experienceMinYears must not exceed experienceMaxYears');
    }
  }

  private today(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
}
